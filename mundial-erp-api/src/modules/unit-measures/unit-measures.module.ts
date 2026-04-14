import { Module } from '@nestjs/common';
import { UnitMeasuresController } from './unit-measures.controller';
import { UnitMeasuresService } from './unit-measures.service';
import { UnitMeasuresRepository } from './unit-measures.repository';

@Module({
  controllers: [UnitMeasuresController],
  providers: [UnitMeasuresService, UnitMeasuresRepository],
  exports: [UnitMeasuresService, UnitMeasuresRepository],
})
export class UnitMeasuresModule {}
