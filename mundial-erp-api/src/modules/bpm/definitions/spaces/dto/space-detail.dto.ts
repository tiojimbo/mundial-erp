import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Folder,
  List,
  Space,
  StatusCategory,
  Visibility,
  WorkflowStatus,
} from '@prisma/client';

export class SpaceFolderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  position: number;

  @ApiProperty({ type: () => [Object] })
  lists: Array<{ id: string; name: string; position: number }>;
}

export class SpaceStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty({ enum: StatusCategory })
  category: StatusCategory;

  @ApiProperty()
  sortOrder: number;
}

export class SpaceDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  position: number;

  @ApiProperty({ enum: Visibility })
  visibility: Visibility;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  creatorId: string | null;

  @ApiPropertyOptional()
  workspaceId: string | null;

  @ApiProperty({ type: () => [SpaceFolderDto] })
  folders: SpaceFolderDto[];

  @ApiProperty({ type: () => [SpaceStatusDto] })
  statuses: SpaceStatusDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Space & {
      folders: Array<Folder & { lists: List[] }>;
      statuses: WorkflowStatus[];
    },
  ): SpaceDetailDto {
    const dto = new SpaceDetailDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.position = entity.position;
    dto.visibility = entity.visibility;
    dto.icon = entity.icon;
    dto.creatorId = entity.creatorId;
    dto.workspaceId = entity.workspaceId;
    dto.folders = entity.folders.map((f) => ({
      id: f.id,
      name: f.name,
      position: f.position,
      lists: f.lists.map((l) => ({
        id: l.id,
        name: l.name,
        position: l.position,
      })),
    }));
    dto.statuses = entity.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      category: s.category,
      sortOrder: s.sortOrder,
    }));
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
