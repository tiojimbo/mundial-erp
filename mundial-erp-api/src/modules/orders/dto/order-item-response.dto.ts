import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductClassification } from '@prisma/client';
import { OrderItemSupplyResponseDto } from './order-item-supply-response.dto';

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  productId: string;

  @ApiPropertyOptional()
  productName: string | null;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPriceCents: number;

  @ApiProperty()
  discountCents: number;

  @ApiProperty()
  totalCents: number;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  pieces: number | null;

  @ApiPropertyOptional()
  size: number | null;

  @ApiPropertyOptional({ enum: ProductClassification })
  classificationSnapshot: ProductClassification | null;

  @ApiPropertyOptional({ type: [OrderItemSupplyResponseDto] })
  supplies: OrderItemSupplyResponseDto[];

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: Record<string, unknown>): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = entity.id as string;
    dto.orderId = entity.orderId as string;
    dto.productId = entity.productId as string;
    dto.productName =
      ((entity.product as Record<string, unknown>)?.name as string) ?? null;
    dto.quantity = entity.quantity as number;
    dto.unitPriceCents = entity.unitPriceCents as number;
    dto.discountCents = entity.discountCents as number;
    dto.totalCents = entity.totalCents as number;
    dto.sortOrder = entity.sortOrder as number;
    dto.pieces = (entity.pieces as number | null) ?? null;
    dto.size = (entity.size as number | null) ?? null;
    dto.classificationSnapshot =
      (entity.classificationSnapshot as ProductClassification | null) ?? null;
    dto.supplies = ((entity.supplies as Record<string, unknown>[]) ?? []).map(
      OrderItemSupplyResponseDto.fromEntity,
    );
    dto.createdAt = entity.createdAt as Date;
    return dto;
  }
}
