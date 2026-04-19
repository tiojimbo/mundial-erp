import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductClassification } from '@prisma/client';

export class CreateProductDto {
  // === Step 1 — Identification ===
  @ApiProperty({ example: 'clxyz123', description: 'ID do tipo de produto' })
  @IsString()
  @IsNotEmpty()
  productTypeId: string;

  @ApiProperty({
    example: 'Telha Térmica 40mm',
    description: 'Nome/descrição do produto',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'clxyz456',
    description: 'ID do departamento de produto',
  })
  @IsOptional()
  @IsString()
  departmentCategoryId?: string;

  @ApiPropertyOptional({ example: 'clxyz789', description: 'ID da marca' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({
    example: 'clxyzabc',
    description: 'ID da unidade de medida base',
  })
  @IsOptional()
  @IsString()
  unitMeasureId?: string;

  @ApiPropertyOptional({
    example: 'clxyzdef',
    description: 'ID da unidade de medida caixa/conjunto',
  })
  @IsOptional()
  @IsString()
  boxUnitMeasureId?: string;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Quantidade de unidades por caixa',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerBox?: number;

  // === Step 2 — Technical Specification ===
  @ApiPropertyOptional({ example: 12.5, description: 'Peso (kg)' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Largura (m)' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 0.04, description: 'Altura (m)' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 3.0, description: 'Comprimento (m)' })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ example: 0.12, description: 'Peso por m³' })
  @IsOptional()
  @IsNumber()
  weightM3?: number;

  @ApiPropertyOptional({ example: 500, description: 'Capacidade de produção' })
  @IsOptional()
  @IsNumber()
  productionCapacity?: number;

  @ApiPropertyOptional({
    example: 'A-01-03',
    description: 'Localização no estoque',
  })
  @IsOptional()
  @IsString()
  stockLocation?: string;

  @ApiPropertyOptional({ example: 10, description: 'Estoque mínimo' })
  @IsOptional()
  @IsNumber()
  minStock?: number;

  @ApiPropertyOptional({ example: 5, description: 'Peças por unidade' })
  @IsOptional()
  @IsNumber()
  piecesPerUnit?: number;

  @ApiPropertyOptional({ example: 3.5, description: 'Tamanho' })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({
    example: 'FABRICACAO_PROPRIA',
    enum: ProductClassification,
    description: 'Classificação do produto',
  })
  @IsOptional()
  @IsEnum(ProductClassification)
  classification?: ProductClassification;

  @ApiPropertyOptional({
    example: 150,
    description: 'Capacidade de carga (kg/m²)',
  })
  @IsOptional()
  @IsNumber()
  loadCapacity?: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  beta?: number;

  @ApiPropertyOptional({ example: 25, description: 'FCK Mpa' })
  @IsOptional()
  @IsNumber()
  fckMpa?: number;

  // === Step 3 — Fiscal ===
  @ApiPropertyOptional({ example: '6810.11.00', description: 'Código NCM' })
  @IsOptional()
  @IsString()
  ncmCode?: string;

  @ApiPropertyOptional({ example: '0', description: 'Origem NFe' })
  @IsOptional()
  @IsString()
  nfeOriginId?: string;

  @ApiPropertyOptional({ example: '5102', description: 'CFOP padrão' })
  @IsOptional()
  @IsString()
  cfopDefault?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Alíquota IPI (%)' })
  @IsOptional()
  @IsNumber()
  ipiRate?: number;

  @ApiPropertyOptional({ description: 'ID da cesta tributária' })
  @IsOptional()
  @IsString()
  taxBasketId?: string;

  // === Step 4 — Pricing ===
  @ApiPropertyOptional({
    example: 15000,
    description: 'Preço de custo (centavos)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Preço de venda (centavos)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Preço mínimo de venda (centavos)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSalePrice?: number;

  @ApiPropertyOptional({ description: 'ID da tabela de preço padrão' })
  @IsOptional()
  @IsString()
  defaultPriceTableId?: string;

  @ApiPropertyOptional({ description: 'ID da fórmula de produção' })
  @IsOptional()
  @IsString()
  formulaId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID no Pro Finanças (legado)',
  })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
