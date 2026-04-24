import { SetMetadata } from '@nestjs/common';

/**
 * Marca uma rota/controller como isento do `KommoFeatureFlagGuard`.
 *
 * Uso tipico: healthchecks, endpoints internos de diagnostico, rotas que
 * precisam responder mesmo quando `KOMMO_SYNC_ENABLED=false` (ex: painel
 * administrativo de status da integracao).
 *
 * Ver `KommoFeatureFlagGuard` e PLANO-KOMMO-DASHBOARD.md secao 1.2
 * (feature flags) / 8 (regras de negocio).
 */
export const SKIP_KOMMO_FEATURE_FLAG_KEY = 'skipKommoFeatureFlag';

export const SkipKommoFeatureFlag = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_KOMMO_FEATURE_FLAG_KEY, true);
