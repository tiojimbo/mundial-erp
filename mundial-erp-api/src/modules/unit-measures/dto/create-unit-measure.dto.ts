import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUnitMeasureDto {
  @ApiProperty({ example: 'UN', description: 'Nome da unidade de medida' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID no Pro Finanças (legado)',
  })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
