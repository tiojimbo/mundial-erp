import { Module, forwardRef } from '@nestjs/common';
import { TaskTemplatesController } from './task-templates.controller';
import { TaskTemplatesService } from './task-templates.service';
import { TaskTemplatesRepository } from './task-templates.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskTemplatesModule — SCAFFOLD (Sprint 6).
 *
 * Mesmo padrao dos demais modulos da feature Tasks: `forwardRef` para o
 * outbox. `PrismaService` e `CycleDetectorService` vem de modulos globais.
 *
 * Registrar em `app.module.ts` ao lado de `TaskTagsModule` /
 * `TaskDependenciesModule` / `TaskLinksModule`.
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesRepository, TaskTemplatesService],
  exports: [TaskTemplatesService, TaskTemplatesRepository],
})
export class TaskTemplatesModule {}
