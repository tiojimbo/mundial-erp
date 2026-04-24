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
  name: string;
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
  name: string;
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
  name!: string;

  @ApiPropertyOptional()
  assigneeId!: string | null;

  @ApiProperty()
  resolved!: boolean;

  @ApiPropertyOptional()
  resolvedAt!: Date | null;

  @ApiPropertyOptional()
  resolvedBy!: string | null;

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
    dto.name = entity.name;
    dto.assigneeId = entity.assigneeId;
    dto.resolved = entity.resolved;
    dto.resolvedAt = entity.resolvedAt;
    dto.resolvedBy = entity.resolvedBy;
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
  workItemId!: string;

  @ApiProperty()
  name!: string;

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
    dto.workItemId = entity.workItemId;
    dto.name = entity.name;
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
