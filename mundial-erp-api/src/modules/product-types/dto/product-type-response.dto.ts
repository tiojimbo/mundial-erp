import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class ProductTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  eanDeptCode: string;

  @ApiProperty()
  lastSequential: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ProductType): ProductTypeResponseDto {
    const dto = new ProductTypeResponseDto();
    dto.id = entity.id;
    dto.prefix = entity.prefix;
    dto.name = entity.name;
    dto.eanDeptCode = entity.eanDeptCode;
    dto.lastSequential = entity.lastSequential;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
