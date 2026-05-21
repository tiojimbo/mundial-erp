import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntriesRepository } from './time-entries.repository';

@Module({
  controllers: [TimeEntriesController],
  providers: [TimeEntriesRepository, TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
