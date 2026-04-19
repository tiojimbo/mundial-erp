import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionOrderItemDto {
  @ApiProperty({ example: 'clxyz123', description: 'ID do item do pedido' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 'clxyz456', description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 100, description: 'Quantidade' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 50, description: 'Quantidade de peças' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pieces?: number;

  @ApiPropertyOptional({ example: 40, description: 'Tamanho' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({
    example: 'clxyzunit',
    description: 'ID da unidade de medida',
  })
  @IsOptional()
  @IsString()
  unitMeasureId?: string;
}

export class CreateProductionOrderDto {
  @ApiProperty({ example: 'clxyz789', description: 'ID do pedido vinculado' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({
    example: 'SIM',
    description: 'Tipo da ordem (SIM/NAO)',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'clxyzmaq', description: 'ID da máquina' })
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional({ example: 'LOTE-001', description: 'Lote' })
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional({
    example: '2026-04-15T00:00:00Z',
    description: 'Data programada',
  })
  @IsOptional()
  @Type(() => Date)
  scheduledDate?: Date;

  @ApiPropertyOptional({
    example: 'clxyzusr',
    description: 'ID do usuário responsável',
  })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({
    example: 'Observações da ordem',
    description: 'Notas/observações',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreateProductionOrderItemDto],
    description: 'Itens da ordem de produção',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionOrderItemDto)
  items?: CreateProductionOrderItemDto[];
}
