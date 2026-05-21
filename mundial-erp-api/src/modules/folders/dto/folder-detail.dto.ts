import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Folder,
  List,
  Space,
  Status,
  StatusInheritance,
  StatusType,
  Visibility,
} from '@prisma/client';

export class FolderListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  position: number;
}

export class FolderStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty({ enum: StatusType })
  type: StatusType;

  @ApiProperty()
  position: number;
}

export class FolderSpaceRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class FolderDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  spaceId: string;

  @ApiProperty()
  position: number;

  @ApiProperty({ enum: Visibility })
  visibility: Visibility;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  creatorId: string | null;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ type: () => [FolderListItemDto] })
  lists: FolderListItemDto[];

  @ApiProperty({ type: () => [FolderStatusDto] })
  statuses: FolderStatusDto[];

  @ApiProperty({ enum: StatusInheritance })
  statusInheritance: StatusInheritance;

  @ApiProperty({ type: () => FolderSpaceRefDto })
  space: FolderSpaceRefDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Folder & {
      lists: List[];
      statuses: Status[];
      space: Pick<Space, 'id' | 'name' | 'slug'> & { statuses?: Status[] };
    },
  ): FolderDetailDto {
    const dto = new FolderDetailDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.spaceId = entity.spaceId;
    dto.position = entity.position;
    dto.visibility = entity.visibility;
    dto.icon = entity.icon;
    dto.creatorId = entity.creatorId;
    dto.isDefault = entity.isDefault;
    dto.statusInheritance = entity.statusInheritance;
    dto.lists = entity.lists.map((l) => ({
      id: l.id,
      name: l.name,
      position: l.position,
    }));
    const sourceStatuses =
      entity.statusInheritance === 'CUSTOM'
        ? entity.statuses
        : (entity.space.statuses ?? []);
    dto.statuses = sourceStatuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      type: s.type,
      position: s.position,
    }));
    dto.space = {
      id: entity.space.id,
      name: entity.space.name,
      slug: entity.space.slug,
    };
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
