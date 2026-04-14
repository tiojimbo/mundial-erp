import { ApiProperty } from '@nestjs/swagger';
import { ProductImage } from '@prisma/client';

export class ProductImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ProductImage): ProductImageResponseDto {
    const dto = new ProductImageResponseDto();
    dto.id = entity.id;
    dto.productId = entity.productId;
    dto.url = entity.url;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
