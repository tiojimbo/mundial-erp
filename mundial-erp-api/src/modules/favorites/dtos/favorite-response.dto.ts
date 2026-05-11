import { ApiProperty } from '@nestjs/swagger';
import { FavoriteEntity } from '@prisma/client';

export interface FavoriteShape {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: FavoriteEntity;
  entityId: string;
  position: number;
  createdAt: Date;
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

  @ApiProperty()
  position!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(entity: FavoriteShape): FavoriteResponseDto {
    const dto = new FavoriteResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.workspaceId = entity.workspaceId;
    dto.entityType = entity.entityType;
    dto.entityId = entity.entityId;
    dto.position = entity.position;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
