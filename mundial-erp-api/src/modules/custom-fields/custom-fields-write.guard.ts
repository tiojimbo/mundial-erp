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
 * CustomFieldsWriteGuard — gate per-workspace das rotas de WRITE de
 * definitions e values (PLANO-TASK-TYPES-TEMPLATES Sprint 1 — TTT-013,
 * evoluido na Sprint 5 TTT-051 para o padrao per-workspace usado em
 * `TasksFeatureFlagGuard`).
 *
 * Ordem de resolucao (primeira match vence):
 *   1. `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED=false` (kill switch global) → 404.
 *   2. Sem `workspaceId` no payload → libera (responsabilidade do
 *      WorkspaceGuard upstream — mesmo defensivo de TasksFeatureFlagGuard).
 *   3. `workspace.settings.featureCustomFieldsWriteEnabled === true` → libera.
 *   4. Default (false ou ausente) → 404.
 *
 * Em "nega" lancamos `NotFoundException` (HTTP 404) — NAO 403, NAO 503. Para
 * o workspace nao habilitado a feature simplesmente nao existe (mesmo
 * principio de TasksFeatureFlagGuard / KommoFeatureFlagGuard).
 *
 * Cache TTL 60s em memoria por workspace — espelha o comportamento de
 * TasksFeatureFlagGuard. Invalidar via restart ou aguardar a janela.
 *
 * Em erro de banco lendo `workspace.settings`, fail-open (libera + log warn).
 * Razao: nao queremos cascatear falha de infra como 404 misterioso bloqueando
 * o rollout — alerta P2 em `custom_fields_flag_db_errors_total` ja cobre o
 * sinal sem derrubar a feature.
 *
 * IMPORTANTE — referenciar este guard com `@UseGuards(CustomFieldsWriteGuard)`
 * APENAS nos endpoints de WRITE:
 *   - POST   /custom-field-definitions
 *   - PATCH  /custom-field-definitions/:id
 *   - DELETE /custom-field-definitions/:id
 *   - PATCH  /tasks/:taskId/custom-fields/:definitionId  (e quaisquer outros
 *     writes de values).
 *
 * NAO aplicar em GETs — leitura precisa funcionar com flag OFF para nao
 * quebrar UI consumindo schema/values existentes (ver README.md ao lado).
 */

type CacheEntry = { ts: number; enabled: boolean };

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5_000;

@Injectable()
export class CustomFieldsWriteGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(CustomFieldsWriteGuard.name);
  private readonly cache = new Map<string, CacheEntry>();

  private readonly globalEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.globalEnabled = this.config.get<boolean>(
      'FEATURE_CUSTOM_FIELDS_WRITE_ENABLED',
      false,
    );
  }

  onModuleInit(): void {
    this.logger.log(
      `CustomFieldsWriteGuard ready — globalEnabled=${this.globalEnabled}`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kill switch global: master rollback via deploy/restart. Igual ao
    // workspace opt-out, nao vazamos existencia.
    if (!this.globalEnabled) {
      this.deny(context, 'global_flag_off');
    }

    const request = context.switchToHttp().getRequest<{
      user?: { workspaceId?: string };
    }>();
    const workspaceId = request.user?.workspaceId;

    // Sem workspaceId no payload: WorkspaceGuard upstream cuida do bloqueio.
    // Mesmo padrao defensivo de TasksFeatureFlagGuard.
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
        msg: 'custom_fields_write_flag_denied',
        reason,
        handler: context.getHandler().name,
        controller: context.getClass().name,
        ...meta,
      },
      'Request blocked by CustomFieldsWriteGuard',
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
      const raw = settings.featureCustomFieldsWriteEnabled;
      // Diferente de TasksFeatureFlagGuard: aqui o default per-workspace e
      // OFF (rollout opt-in). Apenas `=== true` libera.
      return raw === true;
    } catch (err) {
      this.logger.warn(
        {
          msg: 'custom_fields_flag_db_error',
          workspaceId,
          err: err instanceof Error ? err.message : String(err),
        },
        'CustomFieldsWriteGuard falhou ao ler workspace.settings — fail-open',
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
