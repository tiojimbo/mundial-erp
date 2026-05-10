import { Module, forwardRef } from '@nestjs/common';
import { TaskDependenciesService } from './task-dependencies.service';
import { TaskDependenciesRepository } from './task-dependencies.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

/**
 * TaskDependenciesModule (HPP-060: controller removido, Hoppe nao expoe
 * dependencies — usa Task Links com type RELATES_TO/DUPLICATES). Service/
 * Repository mantidos para reuso interno (merge/links migration nas
 * próximas Sprints).
 */
@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  providers: [TaskDependenciesRepository, TaskDependenciesService],
  exports: [TaskDependenciesService, TaskDependenciesRepository],
})
export class TaskDependenciesModule {}
