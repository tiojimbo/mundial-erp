import { Module } from '@nestjs/common';
import { SeparationOrdersController } from './separation-orders.controller';
import { SeparationOrdersService } from './separation-orders.service';
import { SeparationOrdersRepository } from './separation-orders.repository';

@Module({
  controllers: [SeparationOrdersController],
  providers: [SeparationOrdersRepository, SeparationOrdersService],
  exports: [SeparationOrdersService, SeparationOrdersRepository],
})
export class SeparationOrdersModule {}
