import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order, OrderStatus } from '@prisma/client';

export class ClientOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiPropertyOptional()
  title: string | null;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  totalCents: number;

  @ApiProperty()
  paidAmountCents: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  deliveryDeadline: Date | null;

  static fromEntity(entity: Order): ClientOrderResponseDto {
    const dto = new ClientOrderResponseDto();
    dto.id = entity.id;
    dto.orderNumber = entity.orderNumber;
    dto.title = entity.title;
    dto.status = entity.status;
    dto.totalCents = entity.totalCents;
    dto.paidAmountCents = entity.paidAmountCents;
    dto.createdAt = entity.createdAt;
    dto.deliveryDeadline = entity.deliveryDeadline;
    return dto;
  }
}
