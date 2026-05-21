import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Folder } from '@prisma/client';

export class FolderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  spaceId: string;

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

  @ApiPropertyOptional()
  defaultTaskTypeId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Folder & { space?: { name: string } },
  ): FolderResponseDto {
    const dto = new FolderResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.spaceId = entity.spaceId;
    dto.departmentName = entity.space?.name;
    dto.isPrivate = entity.isPrivate;
    dto.icon = entity.icon;
    dto.color = entity.color;
    dto.useSpaceStatuses = entity.useSpaceStatuses;
    dto.sortOrder = entity.position;
    dto.isDefault = entity.isDefault;
    dto.defaultTaskTypeId = entity.defaultTaskTypeId ?? null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
