import { Module, forwardRef } from '@nestjs/common';
import { TaskLinksController } from './task-links.controller';
import { TaskLinksService } from './task-links.service';
import { TaskLinksRepository } from './task-links.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskLinksModule — PLANO-TASKS.md §7.3 (Links).
 *
 * `PrismaService` vem do DatabaseModule (@Global). `forwardRef` em
 * `TaskOutboxModule` segue o mesmo padrao dos outros modulos da feature.
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskLinksController],
  providers: [TaskLinksRepository, TaskLinksService],
  exports: [TaskLinksService, TaskLinksRepository],
})
export class TaskLinksModule {}
