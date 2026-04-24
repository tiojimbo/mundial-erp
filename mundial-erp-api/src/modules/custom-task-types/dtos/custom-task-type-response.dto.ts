import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomTaskType } from '@prisma/client';

/**
 * Resposta publica de um CustomTaskType. Builtins (isBuiltin=true, workspaceId=null)
 * sao visiveis globalmente; tipos privados so para o workspace dono.
 * Ver PLANO-TASKS.md §5.3 e §8.1.
 */
export class CustomTaskTypeResponseDto {
  @ApiProperty()
  id!: string;

  /** NULL quando builtin global. */
  @ApiPropertyOptional({ nullable: true })
  workspaceId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  namePlural!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiPropertyOptional({ nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  isBuiltin!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  static fromEntity(entity: CustomTaskType): CustomTaskTypeResponseDto {
    const dto = new CustomTaskTypeResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.name = entity.name;
    dto.namePlural = entity.namePlural;
    dto.description = entity.description;
    dto.icon = entity.icon;
    dto.color = entity.color;
    dto.avatarUrl = entity.avatarUrl;
    dto.isBuiltin = entity.isBuiltin;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
