import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductDepartment } from '@prisma/client';

export class ProductDepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ProductDepartment): ProductDepartmentResponseDto {
    const dto = new ProductDepartmentResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
