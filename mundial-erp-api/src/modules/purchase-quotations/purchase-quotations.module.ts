import { Module } from '@nestjs/common';
import { PurchaseQuotationsRepository } from './purchase-quotations.repository';
import { PurchaseQuotationsService } from './purchase-quotations.service';
import { PurchaseQuotationsController } from './purchase-quotations.controller';

@Module({
  controllers: [PurchaseQuotationsController],
  providers: [PurchaseQuotationsRepository, PurchaseQuotationsService],
  exports: [PurchaseQuotationsService, PurchaseQuotationsRepository],
})
export class PurchaseQuotationsModule {}
