import { Module, forwardRef } from '@nestjs/common';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';

@Module({
  imports: [forwardRef(() => TaskOutboxModule)],
  controllers: [TaskCommentsController],
  providers: [TaskCommentsRepository, TaskCommentsService],
  exports: [TaskCommentsService, TaskCommentsRepository],
})
export class TaskCommentsModule {}
