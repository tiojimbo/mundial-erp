import { Module } from '@nestjs/common';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';
import { WorkItemsRepository } from './work-items.repository';

@Module({
  controllers: [WorkItemsController],
  providers: [WorkItemsRepository, WorkItemsService],
  exports: [WorkItemsService, WorkItemsRepository],
})
export class WorkItemsModule {}
