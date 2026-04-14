import { Module } from '@nestjs/common';
import { PriceTablesController } from './price-tables.controller';
import { PriceTablesService } from './price-tables.service';
import { PriceTablesRepository } from './price-tables.repository';

@Module({
  controllers: [PriceTablesController],
  providers: [PriceTablesService, PriceTablesRepository],
  exports: [PriceTablesService, PriceTablesRepository],
})
export class PriceTablesModule {}
