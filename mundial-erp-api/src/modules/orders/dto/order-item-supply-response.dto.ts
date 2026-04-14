import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemSupplyStatus } from '@prisma/client';

export class OrderItemSupplyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderItemId: string;

  @ApiPropertyOptional()
  productId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ enum: OrderItemSupplyStatus })
  status: OrderItemSupplyStatus;

  @ApiPropertyOptional()
  readyAt: Date | null;

  @ApiPropertyOptional()
  checkedByUserId: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: Record<string, unknown>): OrderItemSupplyResponseDto {
    const dto = new OrderItemSupplyResponseDto();
    dto.id = entity.id as string;
    dto.orderItemId = entity.orderItemId as string;
    dto.productId = (entity.productId as string | null) ?? null;
    dto.name = entity.name as string;
    dto.quantity = entity.quantity as number;
    dto.status = entity.status as OrderItemSupplyStatus;
    dto.readyAt = (entity.readyAt as Date | null) ?? null;
    dto.checkedByUserId = (entity.checkedByUserId as string | null) ?? null;
    dto.createdAt = entity.createdAt as Date;
    return dto;
  }
}
