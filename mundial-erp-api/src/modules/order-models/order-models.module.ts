import { Module } from '@nestjs/common';
import { OrderModelsController } from './order-models.controller';
import { OrderModelsService } from './order-models.service';
import { OrderModelsRepository } from './order-models.repository';

@Module({
  controllers: [OrderModelsController],
  providers: [OrderModelsService, OrderModelsRepository],
  exports: [OrderModelsService, OrderModelsRepository],
})
export class OrderModelsModule {}
