import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAccountPayableDto {
  @ApiPropertyOptional({ example: 'clxyz123...', description: 'ID do fornecedor' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'clxyz456...', description: 'ID do pedido de compra' })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ example: 'Compra de materia-prima', description: 'Descricao da conta' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000, description: 'Valor em centavos' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amountCents: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z', description: 'Data de vencimento' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ example: 'clxyz789...', description: 'ID da categoria financeira' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
