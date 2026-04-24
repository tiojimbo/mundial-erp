import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators';
import { SKIP_WORKSPACE_GUARD_KEY } from '../../modules/workspaces/decorators/skip-workspace-guard.decorator';
import { SKIP_TASKS_V2_FLAG_KEY } from './skip-tasks-v2-flag.decorator';

/**
 * `TasksFeatureFlagGuard` — gate per-workspace das rotas Tasks v2.
 *
 * Ordem de resolucao (primeira match vence):
 *   1. `@SkipTasksV2Flag()` na rota/controller   → libera (usado em /work-items).
 *   2. `@Public()` ou `@SkipWorkspaceGuard()`    → libera (healthchecks, auth).
 *   3. `TASKS_V2_ENABLED=false`                  → nega (kill switch global).
 *   4. Workspace em `TASKS_V2_DISABLED_WORKSPACES` (CSV) → nega.
 *   5. `workspace.settings.tasksV2Enabled === false` → nega.
 *   6. Default: libera.
 *
 * Em caso de "nega" lancamos `NotFoundException` (HTTP 404) — NAO 503.
 * Objetivo: para o workspace opt-out, a feature simplesmente nao existe.
 * Vazar 503/"feature disabled" iria expor arquitetura interna.
 *
 * Cache TTL 60s em memoria por workspace — absorve mudancas de toggle sem
 * pressao em banco. Invalidar via restart ou mudando `TASKS_V2_*` no env
 * (proximo ciclo). Um evento pub/sub de invalidacao pode ser adicionado
 * quando a telemetria indicar necessidade (nao e hot path).
 *
 * Vide PLANO-TASKS.md §9.1 (feature flags) e ADR-001 (precedencia do
 * WorkspaceGuard — este guard assume que `request.user.workspaceId` ja
 * foi populado).
 */

type CacheEntry = { ts: number; enabled: boolean };

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5_000;

@Injectable()
export class TasksFeatureFlagGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(TasksFeatureFlagGuard.name);
  private readonly cache = new Map<string, CacheEntry>();

  private readonly globalEnabled: boolean;
  private readonly disabledWorkspaces: ReadonlySet<string>;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.globalEnabled =
      (this.config.get<string>('TASKS_V2_ENABLED') ?? 'true').toLowerCase() !==
      'false';

    const csv = this.config.get<string>('TASKS_V2_DISABLED_WORKSPACES') ?? '';
    this.disabledWorkspaces = new Set(
      csv
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
  }

  onModuleInit(): void {
    this.logger.log(
      `TasksFeatureFlagGuard ready — globalEnabled=${this.globalEnabled} disabledWorkspaces=${this.disabledWorkspaces.size}`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TASKS_V2_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipWorkspace = this.reflector.getAllAndOverride<boolean>(
      SKIP_WORKSPACE_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipWorkspace) return true;

    // Kill switch global: igual ao workspace opt-out, nao vazamos existencia.
    if (!this.globalEnabled) {
      this.deny(context, 'global_flag_off');
    }

    const request = context.switchToHttp().getRequest<{
      user?: { workspaceId?: string };
    }>();
    const workspaceId = request.user?.workspaceId;

    // Sem workspaceId no payload, a responsabilidade de bloquear eh do
    // WorkspaceGuard (upstream). Aqui evitamos lancar 404 em rotas que
    // legitimamente rodam sem workspace (devem usar @SkipTasksV2Flag).
    // Defensivamente: se nao ha workspace, libera — o WorkspaceGuard ja
    // rejeitou ou a rota foi marcada como isenta.
    if (!workspaceId) return true;

    if (this.disabledWorkspaces.has(workspaceId)) {
      this.deny(context, 'workspace_env_optout', { workspaceId });
    }

    const cached = this.getCached(workspaceId);
    if (cached !== null) {
      if (!cached) {
        this.deny(context, 'workspace_settings_optout_cached', { workspaceId });
      }
      return true;
    }

    const enabled = await this.resolveFromDatabase(workspaceId);
    this.setCached(workspaceId, enabled);

    if (!enabled) {
      this.deny(context, 'workspace_settings_optout', { workspaceId });
    }

    return true;
  }

  private deny(
    context: ExecutionContext,
    reason: string,
    meta: Record<string, unknown> = {},
  ): never {
    this.logger.debug(
      {
        msg: 'tasks_v2_flag_denied',
        reason,
        handler: context.getHandler().name,
        controller: context.getClass().name,
        ...meta,
      },
      'Request blocked by TasksFeatureFlagGuard',
    );
    throw new NotFoundException('Not Found');
  }

  private async resolveFromDatabase(workspaceId: string): Promise<boolean> {
    try {
      const row = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });
      const settings = (row?.settings ?? {}) as Record<string, unknown>;
      const raw = settings.tasksV2Enabled;
      if (raw === false) return false;
      return true;
    } catch (err) {
      // Em caso de erro de banco, fail-open: preferimos nao cascatar falha
      // de infra como 404 misterioso. Log estruturado + metric fica como
      // alerta (PLANO §9.2 — `tasks_feature_flag_db_errors_total`).
      this.logger.error(
        {
          msg: 'tasks_v2_flag_db_error',
          workspaceId,
          err: err instanceof Error ? err.message : String(err),
        },
        'TasksFeatureFlagGuard falhou ao ler workspace.settings',
      );
      return true;
    }
  }

  private getCached(workspaceId: string): boolean | null {
    const entry = this.cache.get(workspaceId);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      this.cache.delete(workspaceId);
      return null;
    }
    return entry.enabled;
  }

  private setCached(workspaceId: string, enabled: boolean): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Evict ~10% das entradas mais antigas (FIFO via insertion order).
      const toDrop = Math.max(1, Math.floor(CACHE_MAX_ENTRIES * 0.1));
      let i = 0;
      for (const k of this.cache.keys()) {
        if (i++ >= toDrop) break;
        this.cache.delete(k);
      }
    }
    this.cache.set(workspaceId, { ts: Date.now(), enabled });
  }
}
