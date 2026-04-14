import { Module } from '@nestjs/common';
import { ProductionFormulasController } from './production-formulas.controller';
import { ProductionFormulasService } from './production-formulas.service';
import { ProductionFormulasRepository } from './production-formulas.repository';

@Module({
  controllers: [ProductionFormulasController],
  providers: [ProductionFormulasService, ProductionFormulasRepository],
  exports: [ProductionFormulasService, ProductionFormulasRepository],
})
export class ProductionFormulasModule {}
