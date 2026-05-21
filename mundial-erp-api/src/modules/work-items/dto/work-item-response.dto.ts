import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Status,
  StatusType,
  TaskPriority,
  WorkItem,
  WorkItemType,
} from '@prisma/client';

export class WorkItemStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: StatusType })
  category: StatusType;

  @ApiProperty()
  color: string;

  @ApiPropertyOptional()
  icon: string | null;
}

export class WorkItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  listId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  statusId: string;

  @ApiPropertyOptional({ type: WorkItemStatusDto })
  status?: WorkItemStatusDto;

  @ApiProperty({ enum: WorkItemType })
  itemType: WorkItemType;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  /**
   * Campo externo preservado por decisao de compat (ADR-001): Prisma renomeou
   * `assigneeId` -> `primaryAssigneeCache`, mas a API publica segue expondo
   * `assigneeId` para zero breaking change. Mapeado no `fromEntity` abaixo.
   */
  @ApiPropertyOptional()
  assigneeId: string | null;

  @ApiProperty()
  creatorId: string;

  @ApiPropertyOptional()
  parentId: string | null;

  @ApiPropertyOptional()
  startDate: Date | null;

  @ApiPropertyOptional()
  dueDate: Date | null;

  @ApiPropertyOptional()
  completedAt: Date | null;

  @ApiPropertyOptional()
  closedAt: Date | null;

  @ApiPropertyOptional()
  estimatedMinutes: number | null;

  @ApiProperty()
  trackedMinutes: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: WorkItem & { status?: Status },
  ): WorkItemResponseDto {
    const dto = new WorkItemResponseDto();
    dto.id = entity.id;
    dto.listId = entity.listId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.statusId = entity.statusId;
    if (entity.status) {
      dto.status = {
        id: entity.status.id,
        name: entity.status.name,
        category: entity.status.type,
        color: entity.status.color,
        icon: null,
      };
    }
    dto.itemType = entity.itemType;
    dto.priority = entity.priority;
    // ADR-001: coluna renomeada, contrato externo mantido.
    dto.assigneeId = entity.primaryAssigneeCache;
    dto.creatorId = entity.creatorId;
    dto.parentId = entity.parentId;
    dto.startDate = entity.startDate;
    dto.dueDate = entity.dueDate;
    dto.completedAt = entity.completedAt;
    dto.closedAt = entity.closedAt;
    dto.estimatedMinutes = entity.estimatedMinutes;
    dto.trackedMinutes = entity.trackedMinutes;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
