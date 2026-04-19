import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: 'FATURAR',
    description: 'Novo status do pedido',
  })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'Cliente desistiu da compra',
    description: 'Motivo (obrigatorio para cancelamento)',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Conciliacao bancaria confirmada (FATURAR→FATURADO, FATURADO→PRODUZIR)',
  })
  @IsOptional()
  @IsBoolean()
  bankReconciled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Conferencia de entrega OK (PRODUZIDO→ENTREGUE)',
  })
  @IsOptional()
  @IsBoolean()
  deliveryChecked?: boolean;
}
