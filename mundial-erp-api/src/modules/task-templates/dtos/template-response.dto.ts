import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskTemplateScope } from '@prisma/client';

/**
 * Shape de `WorkItemTemplate` — contrato de resposta (Sprint 6).
 *
 * O model Prisma `WorkItemTemplate` e criado pela Migration 3 (`tasks_advanced`).
 * Mesmo padrao defensivo das dependencias/links/tags: `fromEntity` aceita um
 * shape tipado aqui e mapeia para o DTO.
 */
export interface WorkItemTemplateShape {
  id: string;
  workspaceId: string;
  name: string;
  scope: TaskTemplateScope;
  departmentId: string | null;
  processId: string | null;
  payload: Record<string, unknown>;
  subtaskCount: number;
  checklistCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class TemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: TaskTemplateScope })
  scope!: TaskTemplateScope;

  @ApiPropertyOptional()
  departmentId!: string | null;

  @ApiPropertyOptional()
  processId!: string | null;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty({
    description: 'Total de subtasks denormalizado a partir do payload.',
  })
  subtaskCount!: number;

  @ApiProperty({
    description:
      'Total de checklists (em qualquer nivel) denormalizado a partir do payload.',
  })
  checklistCount!: number;

  @ApiPropertyOptional()
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: WorkItemTemplateShape): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.name = entity.name;
    dto.scope = entity.scope;
    dto.departmentId = entity.departmentId;
    dto.processId = entity.processId;
    dto.payload = entity.payload;
    dto.subtaskCount = entity.subtaskCount;
    dto.checklistCount = entity.checklistCount;
    dto.createdBy = entity.createdBy;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
