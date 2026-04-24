import { Module } from '@nestjs/common';
import { TaskActivitiesController } from './task-activities.controller';
import { TaskActivitiesService } from './task-activities.service';
import { TaskActivitiesRepository } from './task-activities.repository';

@Module({
  controllers: [TaskActivitiesController],
  providers: [TaskActivitiesRepository, TaskActivitiesService],
  exports: [TaskActivitiesService, TaskActivitiesRepository],
})
export class TaskActivitiesModule {}
