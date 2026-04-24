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
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators';
import { SKIP_WORKSPACE_GUARD_KEY } from '../../modules/workspaces/decorators/skip-workspace-guard.decorator';
import { SKIP_KOMMO_FEATURE_FLAG_KEY } from './skip-kommo-feature-flag.decorator';

/**
 * `KommoFeatureFlagGuard` — gate global das rotas Kommo (`/kommo/*` e
 * `/webhooks/kommo/*`).
 *
 * Ordem de resolucao (primeira match vence):
 *   1. `@SkipKommoFeatureFlag()` na rota/controller   → libera (healthcheck
 *      interno, admin panel).
 *   2. `@Public()` ou `@SkipWorkspaceGuard()`         → libera.
 *   3. `KOMMO_SYNC_ENABLED=false` (kill switch global) → nega (404).
 *   4. Default: libera — refinamento per-workspace acontece no controller
 *      (leitura de `workspace.settings.kommoSyncEnabled` ou CSV de env
 *      futuro), nao neste guard.
 *
 * Em caso de "nega" lancamos `NotFoundException` (HTTP 404) — NAO 403, NAO
 * 503. Objetivo: para quem nao tem a feature, ela simplesmente nao existe
 * (principio #1 squad-kommo: "nunca vazar existencia da integracao").
 * Vazar 503/"feature disabled" seria enumeracao trivial de tenants com
 * Kommo ativo.
 *
 * Vide PLANO-KOMMO-DASHBOARD.md §1.2 (feature flags) e `squad-kommo.mdc`
 * principios #1 e #18.
 */
@Injectable()
export class KommoFeatureFlagGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(KommoFeatureFlagGuard.name);

  private readonly globalEnabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    this.globalEnabled =
      (this.config.get<string>('KOMMO_SYNC_ENABLED') ?? 'false').toLowerCase() ===
      'true';
  }

  onModuleInit(): void {
    this.logger.log(
      `KommoFeatureFlagGuard ready — globalEnabled=${this.globalEnabled}`,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_KOMMO_FEATURE_FLAG_KEY,
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

    if (!this.globalEnabled) {
      this.deny(context, 'global_flag_off');
    }

    // Refinamento per-workspace (workspace.settings.kommoSyncEnabled,
    // rollout canary) sera implementado quando o schema do
    // WorkspaceFeatureFlag/settings suportar — rodada atual so cobre o
    // kill switch global.
    return true;
  }

  private deny(context: ExecutionContext, reason: string): never {
    this.logger.debug(
      {
        msg: 'kommo_feature_flag_denied',
        reason,
        handler: context.getHandler().name,
        controller: context.getClass().name,
      },
      'Request blocked by KommoFeatureFlagGuard',
    );
    throw new NotFoundException('Not Found');
  }
}
