import { ApiProperty } from '@nestjs/swagger';
import { OrderItemSupplyStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class ToggleSupplyDto {
  @ApiProperty({ enum: OrderItemSupplyStatus, example: 'READY', description: 'Novo status do supply (PENDING ou READY)' })
  @IsEnum(OrderItemSupplyStatus)
  @IsNotEmpty()
  status: OrderItemSupplyStatus;
}
