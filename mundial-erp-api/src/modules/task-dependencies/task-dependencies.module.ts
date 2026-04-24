import { Module, forwardRef } from '@nestjs/common';
import { TaskDependenciesController } from './task-dependencies.controller';
import { TaskDependenciesService } from './task-dependencies.service';
import { TaskDependenciesRepository } from './task-dependencies.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskDependenciesModule — PLANO-TASKS.md §7.3 R1-R4 e §8.3.
 *
 * - `CycleDetectorService` vem do `CommonModule` (marcado `@Global()`), logo
 *   nao precisa ser importado aqui.
 * - `PrismaService` vem do `DatabaseModule` global.
 * - `TaskOutboxModule` e importado via `forwardRef` para alinhar com o padrao
 *   ja adotado em `TaskTagsModule` (evita ciclos eventuais).
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskDependenciesController],
  providers: [TaskDependenciesRepository, TaskDependenciesService],
  exports: [TaskDependenciesService, TaskDependenciesRepository],
})
export class TaskDependenciesModule {}
