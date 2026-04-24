import { SetMetadata } from '@nestjs/common';

/**
 * Marca uma rota/controller como isento do `TasksFeatureFlagGuard`.
 *
 * Uso tipico: controllers legados (`/work-items/*`) que permanecem disponiveis
 * mesmo quando o workspace optou-out da feature Tasks v2. Tambem util em
 * healthchecks e endpoints de diagnostico internos.
 *
 * Ver `TasksFeatureFlagGuard` e PLANO-TASKS.md §9 (feature flags).
 */
export const SKIP_TASKS_V2_FLAG_KEY = 'skipTasksV2Flag';

export const SkipTasksV2Flag = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_TASKS_V2_FLAG_KEY, true);
