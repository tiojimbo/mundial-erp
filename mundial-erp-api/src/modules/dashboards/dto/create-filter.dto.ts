import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const FILTER_OPERATORS = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER',
  'LESS',
  'BETWEEN',
  'IN',
] as const;

export class CreateFilterDto {
  @ApiProperty({ example: 'status', description: 'Campo a filtrar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  field: string;

  @ApiProperty({ enum: FILTER_OPERATORS, example: 'EQUALS' })
  @IsIn(FILTER_OPERATORS)
  operator: string;

  @ApiProperty({
    example: 'ENTREGUE',
    description: 'Valor do filtro (JSON-compatible)',
  })
  @IsDefined()
  value: unknown;

  @ApiPropertyOptional({ example: 'Status do Pedido' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
