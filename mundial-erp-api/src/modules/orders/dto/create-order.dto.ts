import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ example: 'clxyz123client', description: 'ID do cliente' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ example: 'Pedido Telhas TR25' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'clxyz123company' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: 'clxyz123paymethod' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ example: 'clxyz123carrier' })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({ example: 'clxyz123pricetable' })
  @IsOptional()
  @IsString()
  priceTableId?: string;

  @ApiPropertyOptional({ example: 'clxyz123user' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deliveryDeadline?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  proposalValidityDays?: number;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  deliveryNeighborhood?: string;

  @ApiPropertyOptional({ example: 'Brasilia' })
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @ApiPropertyOptional({ example: 'DF' })
  @IsOptional()
  @IsString()
  deliveryState?: string;

  @ApiPropertyOptional({ example: '70000-000' })
  @IsOptional()
  @IsString()
  deliveryCep?: string;

  @ApiPropertyOptional({ example: 'Proximo ao mercado' })
  @IsOptional()
  @IsString()
  deliveryReferencePoint?: string;

  @ApiPropertyOptional({ example: 'Joao Silva' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 20000, description: 'Frete em centavos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  freightCents?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Desconto global em centavos',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountCents?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Substituicao tributaria em centavos',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxSubstitutionCents?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  shouldProduce?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isResale?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasTaxSubstitution?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderFlowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderModelId?: string;

  @ApiPropertyOptional({ type: [CreateOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
