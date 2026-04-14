import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityInstance, ActivityStatus } from '@prisma/client';

export class ActivityInstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  activityId: string;

  @ApiProperty()
  processInstanceId: string;

  @ApiPropertyOptional()
  assignedUserId: string | null;

  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @ApiPropertyOptional()
  startedAt: Date | null;

  @ApiPropertyOptional()
  completedAt: Date | null;

  @ApiPropertyOptional()
  dueAt: Date | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ActivityInstance): ActivityInstanceResponseDto {
    const dto = new ActivityInstanceResponseDto();
    dto.id = entity.id;
    dto.activityId = entity.activityId;
    dto.processInstanceId = entity.processInstanceId;
    dto.assignedUserId = entity.assignedUserId;
    dto.status = entity.status;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;
    dto.dueAt = entity.dueAt;
    dto.notes = entity.notes;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
