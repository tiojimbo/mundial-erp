import { Module, forwardRef } from '@nestjs/common';
import { TaskTagsController } from './task-tags.controller';
import { TaskTagsService } from './task-tags.service';
import { TaskTagsRepository } from './task-tags.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskTagsController],
  providers: [TaskTagsRepository, TaskTagsService],
  exports: [TaskTagsService, TaskTagsRepository],
})
export class TaskTagsModule {}
