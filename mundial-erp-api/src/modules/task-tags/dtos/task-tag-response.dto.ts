import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface WorkItemTagShape {
  id: string;
  workspaceId: string;
  spaceId: string | null;
  name: string;
  nameLower: string;
  color: string | null;
  bgColor: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count?: { links: number } | null;
}

export class TaskTagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiPropertyOptional()
  spaceId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Nome normalizado (case-insensitive).' })
  nameLower!: string;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional()
  bgColor!: string | null;

  @ApiProperty({ description: 'Quantidade de tasks com esta tag.' })
  tasksCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: WorkItemTagShape): TaskTagResponseDto {
    const dto = new TaskTagResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.spaceId = entity.spaceId;
    dto.name = entity.name;
    dto.nameLower = entity.nameLower;
    dto.color = entity.color;
    dto.bgColor = entity.bgColor;
    dto.tasksCount = entity._count?.links ?? 0;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
