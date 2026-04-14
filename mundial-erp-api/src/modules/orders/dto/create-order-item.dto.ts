import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemSupplyDto } from './create-order-item-supply.dto';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'clxyz123product' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10.0, description: 'Quantidade' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 15000, description: 'Preco unitario em centavos' })
  @IsInt()
  @Min(0)
  unitPriceCents: number;

  @ApiPropertyOptional({ example: 0, description: 'Desconto em centavos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountCents?: number;

  @ApiPropertyOptional({ example: 0, description: 'Ordem de exibicao' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 10.0, description: 'Pecas (ex: 10.0)' })
  @IsOptional()
  @IsNumber()
  pieces?: number;

  @ApiPropertyOptional({ example: 3.5, description: 'Tamanho (ex: 3.5)' })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ type: [CreateOrderItemSupplyDto], description: 'Insumos/acabamentos do item' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemSupplyDto)
  supplies?: CreateOrderItemSupplyDto[];
}
