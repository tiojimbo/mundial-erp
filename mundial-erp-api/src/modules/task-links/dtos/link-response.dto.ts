import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType, StatusType } from '@prisma/client';

export interface LinkedTaskShape {
  id: string;
  title: string;
  status: { id: string; name: string; color: string; type: StatusType } | null;
  customType: { id: string; name: string; icon: string | null } | null;
  list: { id: string; name: string } | null;
}

export class LinkedTaskStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty({ enum: StatusType, example: 'NOT_STARTED' })
  type!: StatusType;
}

export class LinkedTaskTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  value!: string;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;
}

export class LinkedTaskListDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class LinkedTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: LinkedTaskStatusDto, nullable: true })
  status!: LinkedTaskStatusDto | null;

  @ApiPropertyOptional({ type: LinkedTaskTypeDto, nullable: true })
  taskType!: LinkedTaskTypeDto | null;

  @ApiPropertyOptional({ type: LinkedTaskListDto, nullable: true })
  list!: LinkedTaskListDto | null;

  static fromEntity(entity: LinkedTaskShape): LinkedTaskDto {
    const dto = new LinkedTaskDto();
    dto.id = entity.id;
    dto.name = entity.title;
    dto.status = entity.status
      ? {
          id: entity.status.id,
          name: entity.status.name,
          color: entity.status.color,
          type: entity.status.type,
        }
      : null;
    dto.taskType = entity.customType
      ? {
          id: entity.customType.id,
          value: entity.customType.name,
          icon: entity.customType.icon ?? null,
        }
      : null;
    dto.list = entity.list
      ? { id: entity.list.id, name: entity.list.name }
      : null;
    return dto;
  }
}

export class WorkItemLinkItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LinkType })
  type!: LinkType;

  @ApiProperty({ type: LinkedTaskDto })
  linkedTask!: LinkedTaskDto;
}

export class DeleteLinkResponseDto {
  @ApiProperty({ example: 'Link removido com sucesso' })
  message!: string;
}
