import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCategory, TaskPriority, WorkItemType } from '@prisma/client';

/**
 * Sumario de status — projecao minima para listagens.
 */
export class TaskStatusSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: StatusCategory })
  category!: StatusCategory;

  @ApiProperty()
  color!: string;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;
}

/**
 * Resposta sumarizada de task (list). PLANO-TASKS.md §7.1: Prisma `select`
 * obrigatorio -> DTO reflete o shape retornado pelo repository.
 *
 * Contrato externo `assigneeId` mantido (ADR-001); mapeamento em `fromRow`.
 */
export class TaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  processId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  statusId!: string;

  @ApiPropertyOptional({ type: TaskStatusSummaryDto })
  status?: TaskStatusSummaryDto;

  @ApiProperty({ enum: WorkItemType })
  itemType!: WorkItemType;

  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  /** ADR-001: externo = `assigneeId`; interno = `primaryAssigneeCache`. */
  @ApiPropertyOptional({ nullable: true })
  assigneeId!: string | null;

  @ApiProperty()
  creatorId!: string;

  @ApiPropertyOptional({ nullable: true })
  parentId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startDate!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  dueDate!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  closedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  estimatedMinutes!: number | null;

  @ApiProperty()
  trackedMinutes!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  archived!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  customTypeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  points!: number | null;

  @ApiProperty()
  timeSpentSeconds!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  /**
   * Monta DTO a partir do shape do `select` do repository. Tolera variacoes
   * de include/select (status opcional, points como Decimal ou number).
   */
  static fromRow(row: Record<string, unknown>): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = row.id as string;
    dto.processId = row.processId as string;
    dto.title = row.title as string;
    dto.description = (row.description as string | null) ?? null;
    dto.statusId = row.statusId as string;
    const statusRow = row.status as
      | {
          id: string;
          name: string;
          category: StatusCategory;
          color: string;
          icon: string | null;
        }
      | undefined
      | null;
    if (statusRow) {
      dto.status = {
        id: statusRow.id,
        name: statusRow.name,
        category: statusRow.category,
        color: statusRow.color,
        icon: statusRow.icon ?? null,
      };
    }
    dto.itemType = row.itemType as WorkItemType;
    dto.priority = row.priority as TaskPriority;
    // ADR-001: preserva nome externo.
    dto.assigneeId = (row.primaryAssigneeCache as string | null) ?? null;
    dto.creatorId = row.creatorId as string;
    dto.parentId = (row.parentId as string | null) ?? null;
    dto.startDate = (row.startDate as Date | null) ?? null;
    dto.dueDate = (row.dueDate as Date | null) ?? null;
    dto.completedAt = (row.completedAt as Date | null) ?? null;
    dto.closedAt = (row.closedAt as Date | null) ?? null;
    dto.estimatedMinutes = (row.estimatedMinutes as number | null) ?? null;
    dto.trackedMinutes = (row.trackedMinutes as number) ?? 0;
    dto.sortOrder = (row.sortOrder as number) ?? 0;
    dto.archived = (row.archived as boolean) ?? false;
    dto.archivedAt = (row.archivedAt as Date | null) ?? null;
    dto.customTypeId = (row.customTypeId as string | null) ?? null;
    const points = row.points;
    if (points === null || points === undefined) {
      dto.points = null;
    } else if (typeof points === 'number') {
      dto.points = points;
    } else {
      // Prisma Decimal -> number via toString()
      const parsed = Number(String(points));
      dto.points = Number.isFinite(parsed) ? parsed : null;
    }
    dto.timeSpentSeconds = (row.timeSpentSeconds as number) ?? 0;
    dto.createdAt = row.createdAt as Date;
    dto.updatedAt = row.updatedAt as Date;
    return dto;
  }
}
