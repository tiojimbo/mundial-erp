import { Module } from '@nestjs/common';
import { OrderFlowsController } from './order-flows.controller';
import { OrderFlowsService } from './order-flows.service';
import { OrderFlowsRepository } from './order-flows.repository';

@Module({
  controllers: [OrderFlowsController],
  providers: [OrderFlowsService, OrderFlowsRepository],
  exports: [OrderFlowsService, OrderFlowsRepository],
})
export class OrderFlowsModule {}
