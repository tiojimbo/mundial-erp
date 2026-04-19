import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PriceTable, PriceTableItem, Product } from '@prisma/client';

type PriceTableItemWithProduct = PriceTableItem & { product?: Product };
type PriceTableWithItems = PriceTable & { items?: PriceTableItemWithProduct[] };

export class PriceTableItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  priceTableId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  priceInCents: number;

  @ApiPropertyOptional()
  product?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: PriceTableItemWithProduct,
  ): PriceTableItemResponseDto {
    const dto = new PriceTableItemResponseDto();
    dto.id = entity.id;
    dto.priceTableId = entity.priceTableId;
    dto.productId = entity.productId;
    dto.priceInCents = entity.priceInCents;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.product) dto.product = entity.product;
    return dto;
  }
}

export class PriceTableResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiPropertyOptional()
  items?: PriceTableItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: PriceTableWithItems): PriceTableResponseDto {
    const dto = new PriceTableResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.isDefault = entity.isDefault;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.items) {
      dto.items = entity.items.map(PriceTableItemResponseDto.fromEntity);
    }
    return dto;
  }
}
