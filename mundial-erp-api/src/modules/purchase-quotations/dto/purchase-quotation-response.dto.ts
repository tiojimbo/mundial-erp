import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseQuotation, PurchaseQuotationItem } from '@prisma/client';

type PurchaseQuotationWithItems = PurchaseQuotation & {
  items?: PurchaseQuotationItem[];
};

export class PurchaseQuotationItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPriceCents: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PurchaseQuotationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  supplierId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  requestedAt: Date | null;

  @ApiPropertyOptional()
  receivedAt: Date | null;

  @ApiProperty()
  totalCents: number;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional({ type: [PurchaseQuotationItemResponseDto] })
  items?: PurchaseQuotationItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: PurchaseQuotationWithItems,
  ): PurchaseQuotationResponseDto {
    const dto = new PurchaseQuotationResponseDto();
    dto.id = entity.id;
    dto.supplierId = entity.supplierId;
    dto.status = entity.status;
    dto.requestedAt = entity.requestedAt;
    dto.receivedAt = entity.receivedAt;
    dto.totalCents = entity.totalCents;
    dto.notes = entity.notes;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.items) {
      dto.items = entity.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    }

    return dto;
  }
}
