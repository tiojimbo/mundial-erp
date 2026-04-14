import { Module } from '@nestjs/common';
import { FinancialSummaryRepository } from './financial-summary.repository';
import { FinancialSummaryService } from './financial-summary.service';
import { FinancialSummaryController } from './financial-summary.controller';

@Module({
  controllers: [FinancialSummaryController],
  providers: [FinancialSummaryRepository, FinancialSummaryService],
  exports: [FinancialSummaryService],
})
export class FinancialSummaryModule {}
