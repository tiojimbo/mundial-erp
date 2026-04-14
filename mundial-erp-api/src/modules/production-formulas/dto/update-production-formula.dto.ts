import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductionFormulaDto } from './create-production-formula.dto';

export class UpdateProductionFormulaDto extends PartialType(
  OmitType(CreateProductionFormulaDto, ['ingredients'] as const),
) {}
