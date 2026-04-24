import { Module } from '@nestjs/common';
import { CustomTaskTypesController } from './custom-task-types.controller';
import { CustomTaskTypesService } from './custom-task-types.service';
import { CustomTaskTypesRepository } from './custom-task-types.repository';

/**
 * CustomTaskTypesModule (PLANO-TASKS.md §6, §7.3).
 *
 * API read-only: `GET /custom-task-types` e `GET /custom-task-types/:id`.
 * Builtins (workspaceId NULL) visiveis a todos; privados apenas ao dono.
 * Cache Redis TTL 5 min com canal de invalidacao `CUSTOM_TASK_TYPES_INVALIDATED`.
 *
 * CRUD via API e nao-objetivo do epico (§1.4) — seed + futuro tool admin.
 */
@Module({
  controllers: [CustomTaskTypesController],
  providers: [CustomTaskTypesRepository, CustomTaskTypesService],
  exports: [CustomTaskTypesService, CustomTaskTypesRepository],
})
export class CustomTaskTypesModule {}
