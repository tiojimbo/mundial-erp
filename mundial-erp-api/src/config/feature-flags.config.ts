import { registerAs } from '@nestjs/config';

// MULTI_WORKSPACE_ENABLED governa enforcement multi-tenant. false = bypass
// total no WorkspaceGuard + response legado em buildAuthResponse. Permite
// rollback flipando env var sem reverter migrations. Vide ADR-001.
export interface FeatureFlagsConfig {
  multiWorkspaceEnabled: boolean;
}

export const featureFlagsConfig = registerAs(
  'featureFlags',
  (): FeatureFlagsConfig => ({
    multiWorkspaceEnabled: process.env.MULTI_WORKSPACE_ENABLED === 'true',
  }),
);
