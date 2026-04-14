import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFormulaIngredientDto {
  @ApiProperty({ example: 'clxyz123', description: 'ID do produto ingrediente (matéria-prima)' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 2.5, description: 'Quantidade necessária' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'clxyzunit', description: 'ID da unidade de medida' })
  @IsOptional()
  @IsString()
  unitMeasureId?: string;
}

export class CreateProductionFormulaDto {
  @ApiProperty({ example: 'Fórmula Telha 40mm', description: 'Nome da fórmula' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 100, description: 'Quantidade produzida por execução da fórmula' })
  @IsNumber()
  @Min(0)
  yieldQuantity: number;

  @ApiPropertyOptional({ type: [CreateFormulaIngredientDto], description: 'Ingredientes da fórmula' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormulaIngredientDto)
  ingredients?: CreateFormulaIngredientDto[];
}
