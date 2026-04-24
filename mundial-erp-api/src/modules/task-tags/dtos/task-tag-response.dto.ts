import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de resposta para `WorkItemTag`.
 *
 * IMPORTANTE: o model `WorkItemTag` e criado pela Migration 2 (`tasks_collaboration`).
 * Ate a migration ser aplicada e `prisma generate` rodar, o tipo importado de
 * `@prisma/client` ainda nao existe; por isso o metodo `fromEntity` aceita
 * `unknown` e confia no shape pactuado no PLANO-TASKS.md §5.3.
 */
export interface WorkItemTagShape {
  id: string;
  workspaceId: string;
  name: string;
  nameLower: string;
  color: string | null;
  bgColor: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class TaskTagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Nome normalizado (case-insensitive).' })
  nameLower!: string;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional()
  bgColor!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: WorkItemTagShape): TaskTagResponseDto {
    const dto = new TaskTagResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.name = entity.name;
    dto.nameLower = entity.nameLower;
    dto.color = entity.color;
    dto.bgColor = entity.bgColor;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
