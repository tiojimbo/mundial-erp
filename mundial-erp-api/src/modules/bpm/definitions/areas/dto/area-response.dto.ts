import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Area } from '@prisma/client';

export class AreaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  departmentId: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiProperty()
  isPrivate: boolean;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  color: string | null;

  @ApiProperty()
  useSpaceStatuses: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Area & { department?: { name: string } },
  ): AreaResponseDto {
    const dto = new AreaResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.departmentId = entity.departmentId;
    dto.departmentName = entity.department?.name;
    dto.isPrivate = entity.isPrivate;
    dto.icon = entity.icon;
    dto.color = entity.color;
    dto.useSpaceStatuses = entity.useSpaceStatuses;
    dto.sortOrder = entity.sortOrder;
    dto.isDefault = entity.isDefault;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
