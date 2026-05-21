import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  List,
  ProcessStatus,
  ProcessType,
  Status,
  StatusInheritance,
  StatusType,
} from '@prisma/client';

export class ListStatusDto {
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

export class ListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  sectorId: string | null;

  @ApiPropertyOptional()
  sectorName?: string;

  @ApiPropertyOptional()
  spaceId: string | null;

  @ApiPropertyOptional()
  folderId: string | null;

  @ApiPropertyOptional({ nullable: true })
  defaultTaskTypeId: string | null;

  @ApiPropertyOptional({ nullable: true })
  defaultTaskType: {
    id: string;
    value: string;
    pluralName: string | null;
    description: string | null;
    icon: string | null;
    spaceId: string | null;
  } | null;

  @ApiProperty({ enum: ProcessType })
  processType: ProcessType;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  featureRoute: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  isProtected: boolean;

  @ApiProperty({ enum: ProcessStatus })
  status: ProcessStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  activitiesCount?: number;

  @ApiPropertyOptional({ enum: StatusInheritance })
  statusInheritance?: StatusInheritance;

  @ApiPropertyOptional({ type: () => [ListStatusDto] })
  statuses?: ListStatusDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: List & {
      sector?: { name: string } | null;
      _count?: { activities: number };
      defaultTaskType?: {
        id: string;
        name: string;
        namePlural: string | null;
        description: string | null;
        icon: string | null;
        spaceId: string | null;
      } | null;
      statuses?: Status[];
      folder?: {
        id: string;
        statusInheritance: StatusInheritance;
        statuses: Status[];
        space: { statuses: Status[] };
      } | null;
      space?: { statuses: Status[] } | null;
    },
  ): ListResponseDto {
    const dto = new ListResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.sectorId = entity.sectorId;
    dto.sectorName = entity.sector?.name;
    dto.spaceId = entity.spaceId;
    dto.folderId = entity.folderId;
    dto.defaultTaskTypeId = entity.defaultTaskTypeId ?? null;
    dto.defaultTaskType = entity.defaultTaskType
      ? {
          id: entity.defaultTaskType.id,
          value: entity.defaultTaskType.name,
          pluralName: entity.defaultTaskType.namePlural,
          description: entity.defaultTaskType.description,
          icon: entity.defaultTaskType.icon,
          spaceId: entity.defaultTaskType.spaceId,
        }
      : null;
    dto.description = entity.description;
    dto.processType = entity.processType;
    dto.featureRoute = entity.featureRoute;
    dto.isPrivate = entity.isPrivate;
    dto.isProtected = entity.isProtected;
    dto.status = entity.status;
    dto.sortOrder = entity.position;
    dto.activitiesCount = entity._count?.activities;
    dto.statusInheritance = entity.statusInheritance;
    dto.statuses = resolveListStatuses(entity).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      type: s.type,
      position: s.position,
    }));
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

function resolveListStatuses(entity: {
  statusInheritance: StatusInheritance;
  statuses?: Status[];
  folder?: {
    statusInheritance: StatusInheritance;
    statuses: Status[];
    space: { statuses: Status[] };
  } | null;
  space?: { statuses: Status[] } | null;
}): Status[] {
  if (entity.statusInheritance === 'CUSTOM') {
    return entity.statuses ?? [];
  }
  if (entity.statusInheritance === 'FOLDER' && entity.folder) {
    if (entity.folder.statusInheritance === 'CUSTOM') {
      return entity.folder.statuses ?? [];
    }
    return entity.folder.space?.statuses ?? [];
  }
  return entity.space?.statuses ?? entity.folder?.space?.statuses ?? [];
}
