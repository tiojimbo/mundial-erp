import { Module } from '@nestjs/common';
import { StockRequisitionsController } from './stock-requisitions.controller';
import { StockRequisitionsService } from './stock-requisitions.service';
import { StockRequisitionsRepository } from './stock-requisitions.repository';
import { RequisitionPdfService } from './pdf/requisition-pdf.service';

@Module({
  controllers: [StockRequisitionsController],
  providers: [
    StockRequisitionsRepository,
    StockRequisitionsService,
    RequisitionPdfService,
  ],
  exports: [StockRequisitionsService, StockRequisitionsRepository],
})
export class StockRequisitionsModule {}
