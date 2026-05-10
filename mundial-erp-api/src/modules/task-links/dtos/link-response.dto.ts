import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '@prisma/client';

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

export class WorkItemLinkItemDto {
  @ApiProperty()
  linkId!: string;

  @ApiProperty({ enum: LinkType })
  type!: LinkType;

  @ApiProperty({ type: WorkItemLinkSummaryDto })
  task!: WorkItemLinkSummaryDto;
}

export class TaskLinksResponseDto {
  @ApiProperty({
    type: [WorkItemLinkItemDto],
    description:
      'Links da task — inclui arestas em ambas as direcoes. O `type` reflete a perspectiva da task consultada (DUPLICATES vira IS_DUPLICATED_BY quando a task e o lado `to`).',
  })
  links!: WorkItemLinkItemDto[];
}
