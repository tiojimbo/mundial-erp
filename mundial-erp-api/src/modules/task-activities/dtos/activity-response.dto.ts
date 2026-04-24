import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma, TaskActivityType } from '@prisma/client';

export interface ActivityActorShape {
  id: string;
  name: string;
}

export interface ActivityShape {
  id: string;
  workItemId: string;
  type: TaskActivityType;
  actorId: string | null;
  actor?: ActivityActorShape | null;
  payload: Prisma.JsonValue;
  createdAt: Date;
}

export class ActivityActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ActivityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workItemId!: string;

  @ApiProperty({ enum: TaskActivityType })
  type!: TaskActivityType;

  @ApiPropertyOptional()
  actorId!: string | null;

  @ApiPropertyOptional({ type: ActivityActorDto })
  actor!: ActivityActorDto | null;

  @ApiProperty()
  payload!: Prisma.JsonValue;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(entity: ActivityShape): ActivityResponseDto {
    const dto = new ActivityResponseDto();
    dto.id = entity.id;
    dto.workItemId = entity.workItemId;
    dto.type = entity.type;
    dto.actorId = entity.actorId;
    dto.actor = entity.actor ?? null;
    dto.payload = entity.payload;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class ActivitiesListResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  items!: ActivityResponseDto[];

  @ApiProperty()
  total!: number;
}
