import { Module } from '@nestjs/common';
import { PurchaseQuotationsModule } from '../purchase-quotations/purchase-quotations.module';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';

@Module({
  imports: [PurchaseQuotationsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersRepository, PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
