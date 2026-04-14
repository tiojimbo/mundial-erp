import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderTimelineEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: OrderStatus })
  fromStatus: OrderStatus;

  @ApiProperty({ enum: OrderStatus })
  toStatus: OrderStatus;

  @ApiProperty()
  changedByUserId: string;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiPropertyOptional()
  metadata: Record<string, any> | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: Record<string, unknown>): OrderTimelineEntryDto {
    const dto = new OrderTimelineEntryDto();
    dto.id = entity.id as string;
    dto.fromStatus = entity.fromStatus as OrderStatus;
    dto.toStatus = entity.toStatus as OrderStatus;
    dto.changedByUserId = entity.changedByUserId as string;
    dto.reason = (entity.reason as string | null) ?? null;
    dto.metadata = (entity.metadata as Record<string, any> | null) ?? null;
    dto.createdAt = entity.createdAt as Date;
    return dto;
  }
}
