import { Module, forwardRef } from '@nestjs/common';
import { TaskWatchersController } from './task-watchers.controller';
import { TaskWatchersService } from './task-watchers.service';
import { TaskWatchersRepository } from './task-watchers.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskWatchersModule (PLANO-TASKS.md §7.3 — Watchers)
 *
 * Encapsula:
 *   - TaskWatchersController (GET/POST/DELETE /tasks/:taskId/watchers[/:userId])
 *   - TaskWatchersService    (regras de self-add vs add-other, idempotencia)
 *   - TaskWatchersRepository (acesso ao model WorkItemWatcher)
 *
 * Depende de:
 *   - PrismaService (DatabaseModule e @Global, nao precisa importar)
 *   - CommonModule  (@Global, nao precisa importar)
 *   - TaskOutboxModule (fonte dos eventos WATCHER_ADDED/WATCHER_REMOVED)
 *
 * Exports: TaskWatchersService + TaskWatchersRepository para reuso pelo
 * TasksModule (TSK-204 / PATCH /tasks/:id com `watchers:{add,rem}`).
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskWatchersController],
  providers: [TaskWatchersRepository, TaskWatchersService],
  exports: [TaskWatchersService, TaskWatchersRepository],
})
export class TaskWatchersModule {}
