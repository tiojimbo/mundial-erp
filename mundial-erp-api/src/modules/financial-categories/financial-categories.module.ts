import { Module } from '@nestjs/common';
import { FinancialCategoriesController } from './financial-categories.controller';
import { FinancialCategoriesService } from './financial-categories.service';
import { FinancialCategoriesRepository } from './financial-categories.repository';

@Module({
  controllers: [FinancialCategoriesController],
  providers: [FinancialCategoriesService, FinancialCategoriesRepository],
  exports: [FinancialCategoriesService, FinancialCategoriesRepository],
})
export class FinancialCategoriesModule {}
