import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CustomFieldGroup } from '@prisma/client';

export class CustomFieldGroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  color!: string | null;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: CustomFieldGroup): CustomFieldGroupResponseDto {
    const dto = new CustomFieldGroupResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.name = entity.name;
    dto.color = entity.color;
    dto.position = entity.position;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
