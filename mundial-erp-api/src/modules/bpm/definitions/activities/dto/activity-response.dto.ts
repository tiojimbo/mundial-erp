import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Activity, OrderStatus, Role, Task } from '@prisma/client';

export class ActivityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  processId: string;

  @ApiPropertyOptional()
  processName?: string;

  @ApiProperty({ enum: Role })
  ownerRole: Role;

  @ApiPropertyOptional()
  inputDescription: string | null;

  @ApiPropertyOptional()
  outputDescription: string | null;

  @ApiPropertyOptional()
  slaMinutes: number | null;

  @ApiPropertyOptional()
  exceptions: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isAutomatic: boolean;

  @ApiPropertyOptional({ enum: OrderStatus })
  triggerOnStatus: OrderStatus | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Activity & { process?: { name: string }; tasks?: Task[] },
  ): ActivityResponseDto {
    const dto = new ActivityResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.processId = entity.processId;
    dto.processName = entity.process?.name;
    dto.ownerRole = entity.ownerRole;
    dto.inputDescription = entity.inputDescription;
    dto.outputDescription = entity.outputDescription;
    dto.slaMinutes = entity.slaMinutes;
    dto.exceptions = entity.exceptions;
    dto.sortOrder = entity.sortOrder;
    dto.isAutomatic = entity.isAutomatic;
    dto.triggerOnStatus = entity.triggerOnStatus;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
