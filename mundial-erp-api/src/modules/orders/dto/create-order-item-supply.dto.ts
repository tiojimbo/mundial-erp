import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderItemSupplyDto {
  @ApiProperty({ example: 'Acabamento frontal', description: 'Nome do insumo/acabamento' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'clxyz123product', description: 'ID do produto insumo (opcional)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Quantidade' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
