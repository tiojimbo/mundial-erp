import { Module } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersRepository } from './production-orders.repository';
import { ProductionOrderPdfService } from '../orders/pdf/production-order-pdf.service';

@Module({
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService, ProductionOrdersRepository, ProductionOrderPdfService],
  exports: [ProductionOrdersService, ProductionOrdersRepository],
})
export class ProductionOrdersModule {}
