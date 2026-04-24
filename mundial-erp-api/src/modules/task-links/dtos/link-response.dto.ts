import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mesma estrategia de `task-dependency-response.dto.ts`: um summary compacto
 * sem acoplar ao `WorkItemResponseDto` completo, que ainda nao existe no
 * repositorio (Sprint 1 em andamento).
 *
 * Links sao SIMETRICOS por contrato (PLANO-TASKS.md §7.3). No banco a linha
 * e unidirecional (`from`, `to`) mas a API apresenta sempre os "outros lados"
 * da relacao em um unico array.
 */
export interface WorkItemLinkSummaryShape {
  id: string;
  title: string;
  statusId: string;
  statusCategory?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  primaryAssigneeId?: string | null;
  archived?: boolean;
}

export class WorkItemLinkSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  statusId!: string;

  @ApiPropertyOptional()
  statusCategory?: string | null;

  @ApiPropertyOptional()
  priority?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  dueDate?: Date | null;

  @ApiPropertyOptional()
  primaryAssigneeId?: string | null;

  @ApiPropertyOptional()
  archived?: boolean;

  static fromEntity(entity: WorkItemLinkSummaryShape): WorkItemLinkSummaryDto {
    const dto = new WorkItemLinkSummaryDto();
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

export class TaskLinksResponseDto {
  @ApiProperty({
    type: [WorkItemLinkSummaryDto],
    description:
      'Lado "outro" da relacao. Inclui tanto arestas `from=taskId` quanto `to=taskId` (simetria).',
  })
  links!: WorkItemLinkSummaryDto[];
}
