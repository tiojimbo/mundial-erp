import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateConsumptionDto {
  @ApiProperty({ example: 'clxyz123', description: 'ID do ingrediente (produto matéria-prima)' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiPropertyOptional({ example: 'clxyzunit', description: 'ID da unidade de medida' })
  @IsOptional()
  @IsString()
  unitMeasureId?: string;

  @ApiProperty({ example: 50, description: 'Quantidade planejada' })
  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @ApiPropertyOptional({ example: 48.5, description: 'Quantidade real consumida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Peso em m³' })
  @IsOptional()
  @IsNumber()
  weightM3?: number;

  @ApiPropertyOptional({ example: 25.5, description: 'Peso' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Custo unitário em centavos' })
  @IsOptional()
  @IsNumber()
  costCents?: number;

  @ApiPropertyOptional({ example: 75000, description: 'Custo total em centavos' })
  @IsOptional()
  @IsNumber()
  totalCostCents?: number;
}
