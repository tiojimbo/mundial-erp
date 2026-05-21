import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteEntity, FavoritePosition } from '@prisma/client';

export interface FavoriteEntitySummary {
  id: string;
  name: string;
  icon?: string | null;
  folderId?: string | null;
  spaceId?: string | null;
  listId?: string | null;
  [key: string]: unknown;
}

export interface FavoriteShape {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: FavoriteEntity;
  entityId: string;
  position: FavoritePosition;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export class FavoriteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ enum: FavoriteEntity })
  entityType!: FavoriteEntity;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: FavoritePosition })
  position!: FavoritePosition;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Resumo da entidade favoritada (resolvido pelo backend)',
  })
  entity?: FavoriteEntitySummary | null;

  static fromEntity(
    entity: FavoriteShape,
    entitySummary?: FavoriteEntitySummary | null,
  ): FavoriteResponseDto {
    const dto = new FavoriteResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.workspaceId = entity.workspaceId;
    dto.entityType = entity.entityType;
    dto.entityId = entity.entityId;
    dto.position = entity.position;
    dto.order = entity.order;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.entity = entitySummary ?? null;
    return dto;
  }
}
