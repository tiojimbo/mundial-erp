import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

/**
 * TaskTypeTemplatesGuard — gate per-workspace do modulo Task Type
 * Templates (PLANO-TASK-TYPES-TEMPLATES Sprint 3 — TTT-033, M2; evoluido
 * na Sprint 5 TTT-051 para o padrao per-workspace usado em
 * `TasksFeatureFlagGuard`).
 *
 * Ordem de resolucao (primeira match vence):
 *   1. `FEATURE_TASK_TYPE_TEMPLATES_ENABLED=false` (kill switch global) → 404.
 *   2. Sem `workspaceId` no payload → libera (responsabilidade do
 *      WorkspaceGuard upstream — mesmo defensivo de TasksFeatureFlagGuard).
 *   3. `workspace.settings.featureTaskTypeTemplatesEnabled === true` → libera.
 *   4. Default (false ou ausente) → 404.
 *
 * Em "nega" lancamos `NotFoundException` (HTTP 404) — NAO 403, NAO 503.
 * Mesmo principio de TasksFeatureFlagGuard / KommoFeatureFlagGuard /
 * CustomFieldsWriteGuard: para o workspace nao habilitado a feature
 * simplesmente nao existe.
 *
 * Cache TTL 60s em memoria por workspace — espelha TasksFeatureFlagGuard.
 *
 * Em erro de banco lendo `workspace.settings`, fail-open (libera + log warn).
 *
 * IMPORTANTE — referenciar este guard com
 * `@UseGuards(TaskTypeTemplatesGuard)` no nivel do controller
 * `TaskTypeTemplatesController` (TTT-031/TTT-032 — Felipe), cobrindo:
 *   - GET /task-type-templates
 *   - GET /task-type-templates/:customTaskTypeId
 *
 * Em paralelo, `tasks.service.create` consulta a flag diretamente via
 * ConfigService (kill switch global) antes de instanciar template (TTT-035)
 * — guard cuida apenas do plano HTTP. Flag independente de
 * FEATURE_CUSTOM_FIELDS_WRITE_ENABLED para rollback granular por modulo
 * (vide PLANO §Decisoes-Chave D8).
 */

type CacheEntry = { ts: number; enabled: boolean };

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5_000;

@Injectable()
export class TaskTypeTemplatesGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(TaskTypeTemplatesGuard.name);
  private readonly cache = new Map<string, CacheEntry>();

  private readonly globalEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.globalEnabled = this.config.get<boolean>(
      'FEATURE_TASK_TYPE_TEMPLATES_ENABLED',
      false,
    );
  }

  onModuleInit(): void {
    this.logger.log(
      `TaskTypeTemplatesGuard ready — globalEnabled=${this.globalEnabled}`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kill switch global vence sempre — rollback de emergencia via
    // deploy/restart, igual ao opt-out per-workspace.
    if (!this.globalEnabled) {
      this.deny(context, 'global_flag_off');
    }

    const request = context.switchToHttp().getRequest<{
      user?: { workspaceId?: string };
    }>();
    const workspaceId = request.user?.workspaceId;

    if (!workspaceId) return true;

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
        msg: 'task_type_templates_flag_denied',
        reason,
        handler: context.getHandler().name,
        controller: context.getClass().name,
        ...meta,
      },
      'Request blocked by TaskTypeTemplatesGuard',
    );
    throw new NotFoundException();
  }

  private async resolveFromDatabase(workspaceId: string): Promise<boolean> {
    try {
      const row = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });
      const settings = (row?.settings ?? {}) as Record<string, unknown>;
      const raw = settings.featureTaskTypeTemplatesEnabled;
      // Default per-workspace: OFF (rollout opt-in). Apenas `=== true` libera.
      return raw === true;
    } catch (err) {
      this.logger.warn(
        {
          msg: 'task_type_templates_flag_db_error',
          workspaceId,
          err: err instanceof Error ? err.message : String(err),
        },
        'TaskTypeTemplatesGuard falhou ao ler workspace.settings — fail-open',
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
