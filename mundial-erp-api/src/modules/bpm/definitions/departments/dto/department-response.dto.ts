import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Department, Sector } from '@prisma/client';

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  color: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isProtected: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Department & { sectors?: Sector[] }): DepartmentResponseDto {
    const dto = new DepartmentResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.icon = entity.icon;
    dto.color = entity.color;
    dto.isPrivate = entity.isPrivate;
    dto.isDefault = entity.isDefault;
    dto.isProtected = entity.isProtected;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
