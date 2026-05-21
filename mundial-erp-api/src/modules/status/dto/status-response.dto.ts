import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status, StatusType, WorkItem } from '@prisma/client';

export class StatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: StatusType })
  type: StatusType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  position: number;

  @ApiPropertyOptional({ nullable: true })
  spaceId: string | null;

  @ApiPropertyOptional({ nullable: true })
  folderId: string | null;

  @ApiPropertyOptional({ nullable: true })
  listId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Status): StatusResponseDto {
    const dto = new StatusResponseDto();
    dto.id = entity.id;
    dto.type = entity.type;
    dto.name = entity.name;
    dto.color = entity.color;
    dto.position = entity.position;
    dto.spaceId = entity.spaceId;
    dto.folderId = entity.folderId;
    dto.listId = entity.listId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class StatusDetailResponseDto extends StatusResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  tasks: WorkItem[];

  static fromEntityWithTasks(
    entity: Status & { workItems: WorkItem[] },
  ): StatusDetailResponseDto {
    const dto = new StatusDetailResponseDto();
    Object.assign(dto, StatusResponseDto.fromEntity(entity));
    dto.tasks = entity.workItems;
    return dto;
  }
}
