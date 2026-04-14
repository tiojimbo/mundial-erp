import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockRequisitionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStockRequisitionItemDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantidade solicitada (na unidade selecionada)' })
  @IsNumber()
  @Min(0.01)
  requestedQuantity: number;

  @ApiProperty({ description: 'Tipo de unidade: UN ou CX', enum: ['UN', 'CX'] })
  @IsIn(['UN', 'CX'])
  unitType: string;

  @ApiPropertyOptional({ description: 'Unidades por caixa (obrigatorio se unitType = CX)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerBox?: number;
}

export class CreateStockRequisitionDto {
  @ApiProperty({ enum: StockRequisitionType, description: 'VENDA ou INTERNO' })
  @IsEnum(StockRequisitionType)
  type: StockRequisitionType;

  @ApiPropertyOptional({ description: 'ID do pedido (obrigatorio se type = VENDA)' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Observacoes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockRequisitionItemDto], description: 'Itens da requisicao' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockRequisitionItemDto)
  items: CreateStockRequisitionItemDto[];
}
