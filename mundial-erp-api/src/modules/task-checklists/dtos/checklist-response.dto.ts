import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape pactuado para WorkItemChecklist + items.
 *
 * O model e expandido pela Migration 3 (`tasks_advanced`). Ate `prisma generate`
 * rodar pos-migration, o tipo Prisma pode nao estar disponivel — por isso
 * trabalhamos com shapes explicitos (mesmo padrao de task-tags).
 */
export interface ChecklistItemShape {
  id: string;
  checklistId: string;
  parentId: string | null;
  title: string;
  assigneeId: string | null;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  position: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistShape {
  id: string;
  workItemId: string;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  items?: ChecklistItemShape[];
}

export class ChecklistItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  checklistId!: string;

  @ApiPropertyOptional()
  parentId!: string | null;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional()
  assigneeId!: string | null;

  @ApiProperty()
  completed!: boolean;

  @ApiPropertyOptional()
  completedAt!: Date | null;

  @ApiPropertyOptional()
  completedById!: string | null;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: ChecklistItemShape): ChecklistItemResponseDto {
    const dto = new ChecklistItemResponseDto();
    dto.id = entity.id;
    dto.checklistId = entity.checklistId;
    dto.parentId = entity.parentId;
    dto.text = entity.title;
    dto.assigneeId = entity.assigneeId;
    dto.completed = entity.resolved;
    dto.completedAt = entity.resolvedAt;
    dto.completedById = entity.resolvedBy;
    dto.position = entity.position;
    dto.source = entity.source;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class ChecklistResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [ChecklistItemResponseDto] })
  items?: ChecklistItemResponseDto[];

  static fromEntity(entity: ChecklistShape): ChecklistResponseDto {
    const dto = new ChecklistResponseDto();
    dto.id = entity.id;
    dto.taskId = entity.workItemId;
    dto.title = entity.title;
    dto.position = entity.position;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.items) {
      dto.items = entity.items.map((it) =>
        ChecklistItemResponseDto.fromEntity(it),
      );
    }
    return dto;
  }
}
