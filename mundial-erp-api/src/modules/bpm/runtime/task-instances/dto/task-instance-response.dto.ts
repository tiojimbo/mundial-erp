import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskInstance, TaskStatus } from '@prisma/client';

export class TaskInstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  activityInstanceId: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional()
  completedByUserId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: TaskInstance): TaskInstanceResponseDto {
    const dto = new TaskInstanceResponseDto();
    dto.id = entity.id;
    dto.taskId = entity.taskId;
    dto.activityInstanceId = entity.activityInstanceId;
    dto.status = entity.status;
    dto.completedByUserId = entity.completedByUserId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
