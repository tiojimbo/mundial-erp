import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Area } from '@prisma/client';

export class AreaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  departmentId: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Area & { department?: { name: string } }): AreaResponseDto {
    const dto = new AreaResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.departmentId = entity.departmentId;
    dto.departmentName = entity.department?.name;
    dto.sortOrder = entity.sortOrder;
    dto.isDefault = entity.isDefault;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
