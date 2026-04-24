import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape minimo de `WorkItem` usado para serializar os lados de uma dependencia.
 * Nao reusamos `WorkItemResponseDto` porque:
 *  1) este endpoint responde apenas com metadados "suficientes" para renderizar
 *     chips de tasks bloqueadoras/bloqueadas na UI (PLANO-TASKS.md §7.3);
 *  2) o modelo completo de `WorkItemResponseDto` ainda nao existe (Sprint 1
 *     em andamento — ver task-tags para o mesmo padrao defensivo).
 */
export interface WorkItemDependencySummaryShape {
  id: string;
  title: string;
  statusId: string;
  statusCategory?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  primaryAssigneeId?: string | null;
  archived?: boolean;
}

export class WorkItemDependencySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  statusId!: string;

  @ApiPropertyOptional({
    description: 'Categoria do status (NOT_STARTED, ACTIVE, DONE, CLOSED).',
  })
  statusCategory?: string | null;

  @ApiPropertyOptional()
  priority?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  dueDate?: Date | null;

  @ApiPropertyOptional()
  primaryAssigneeId?: string | null;

  @ApiPropertyOptional()
  archived?: boolean;

  static fromEntity(
    entity: WorkItemDependencySummaryShape,
  ): WorkItemDependencySummaryDto {
    const dto = new WorkItemDependencySummaryDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.statusId = entity.statusId;
    dto.statusCategory = entity.statusCategory ?? null;
    dto.priority = entity.priority ?? null;
    dto.dueDate = entity.dueDate ?? null;
    dto.primaryAssigneeId = entity.primaryAssigneeId ?? null;
    dto.archived = entity.archived ?? false;
    return dto;
  }
}

/**
 * Resposta do `GET /tasks/:taskId/dependencies`.
 *  - `blocking`: tasks que **esta task** bloqueia (arestas `from=taskId`).
 *  - `waitingOn`: tasks que **bloqueiam** esta task (arestas `to=taskId`).
 *
 * A linguagem segue PLANO-TASKS.md §7.3 R1.
 */
export class TaskDependenciesResponseDto {
  @ApiProperty({ type: [WorkItemDependencySummaryDto] })
  blocking!: WorkItemDependencySummaryDto[];

  @ApiProperty({ type: [WorkItemDependencySummaryDto] })
  waitingOn!: WorkItemDependencySummaryDto[];
}
