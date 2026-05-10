import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface WorkItemTimeEntryShape {
  id: string;
  workItemId: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TimeEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ format: 'date-time' })
  startTime!: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  endTime!: Date | null;

  @ApiPropertyOptional()
  durationSeconds!: number | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: WorkItemTimeEntryShape): TimeEntryResponseDto {
    const dto = new TimeEntryResponseDto();
    dto.id = entity.id;
    dto.taskId = entity.workItemId;
    dto.userId = entity.userId;
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.durationSeconds = entity.durationSeconds;
    dto.description = entity.description;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
