import { PartialType } from '@nestjs/swagger';
import { CreateUnitMeasureDto } from './create-unit-measure.dto';

export class UpdateUnitMeasureDto extends PartialType(CreateUnitMeasureDto) {}
