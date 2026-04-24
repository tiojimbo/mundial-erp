import { Module, forwardRef } from '@nestjs/common';
import { TaskChecklistsController } from './task-checklists.controller';
import { TaskChecklistsService } from './task-checklists.service';
import { TaskChecklistsRepository } from './task-checklists.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskChecklistsController],
  providers: [TaskChecklistsRepository, TaskChecklistsService],
  exports: [TaskChecklistsService, TaskChecklistsRepository],
})
export class TaskChecklistsModule {}
