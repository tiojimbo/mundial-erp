import { Module, forwardRef } from '@nestjs/common';
import { TaskWatchersService } from './task-watchers.service';
import { TaskWatchersRepository } from './task-watchers.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskWatchersModule (HPP-060: controller removido, Hoppe nao expoe
 * watchers via REST). Service/Repository mantidos para reuso por
 * Automation futura (Sprint 6) e por delta `watchers: {add,rem}` no
 * PUT /tasks/:id que continua aceitando.
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  providers: [TaskWatchersRepository, TaskWatchersService],
  exports: [TaskWatchersService, TaskWatchersRepository],
})
export class TaskWatchersModule {}
