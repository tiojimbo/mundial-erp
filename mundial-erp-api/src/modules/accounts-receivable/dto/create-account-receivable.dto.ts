import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAccountReceivableDto {
  @ApiPropertyOptional({
    example: 'cuid-order-id',
    description: 'ID do pedido vinculado',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ example: 'cuid-client-id', description: 'ID do cliente' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({
    example: 'Parcela 1/3 - Pedido 0042',
    description: 'Descrição da conta',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000, description: 'Valor em centavos' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  amountCents: number;

  @ApiProperty({
    example: '2026-05-15',
    description: 'Data de vencimento (ISO 8601)',
  })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({
    example: 'cuid-invoice-id',
    description: 'ID da nota fiscal vinculada',
  })
  @IsOptional()
  @IsString()
  invoiceId?: string;
}
