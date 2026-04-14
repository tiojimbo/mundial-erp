import { Module } from '@nestjs/common';
import { ProcessViewsController } from './process-views.controller';
import { ProcessViewsService } from './process-views.service';
import { ProcessViewsRepository } from './process-views.repository';

@Module({
  controllers: [ProcessViewsController],
  providers: [ProcessViewsService, ProcessViewsRepository],
  exports: [ProcessViewsService, ProcessViewsRepository],
})
export class ProcessViewsModule {}
