import { Global, Module } from '@nestjs/common';
import { KommoFeatureFlagGuard } from './kommo-feature-flag.guard';
import { TasksFeatureFlagGuard } from './tasks-feature-flag.guard';

/**
 * Feature flags transversais (Sprint 8).
 *
 * Registra providers que podem ser consumidos via `@UseGuards(...)` em
 * qualquer modulo sem re-importar. `PrismaService` e `Reflector` ja sao
 * globais via DatabaseModule e Nest core.
 */
@Global()
@Module({
  providers: [TasksFeatureFlagGuard, KommoFeatureFlagGuard],
  exports: [TasksFeatureFlagGuard, KommoFeatureFlagGuard],
})
export class FeatureFlagsModule {}
