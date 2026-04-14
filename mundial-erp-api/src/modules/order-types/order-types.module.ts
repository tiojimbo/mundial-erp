import { Module } from '@nestjs/common';
import { OrderTypesController } from './order-types.controller';
import { OrderTypesService } from './order-types.service';
import { OrderTypesRepository } from './order-types.repository';

@Module({
  controllers: [OrderTypesController],
  providers: [OrderTypesService, OrderTypesRepository],
  exports: [OrderTypesService, OrderTypesRepository],
})
export class OrderTypesModule {}
