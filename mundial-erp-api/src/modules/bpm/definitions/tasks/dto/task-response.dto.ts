import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task } from '@prisma/client';

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  activityId: string;

  @ApiPropertyOptional()
  activityName?: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isMandatory: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Task & { activity?: { name: string } },
  ): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = entity.id;
    dto.activityId = entity.activityId;
    dto.activityName = entity.activity?.name;
    dto.description = entity.description;
    dto.sortOrder = entity.sortOrder;
    dto.isMandatory = entity.isMandatory;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
