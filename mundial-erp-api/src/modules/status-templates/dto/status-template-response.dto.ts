import { ApiProperty } from '@nestjs/swagger';
import { StatusTemplate, StatusTemplateItem } from '@prisma/client';

export class StatusTemplateItemResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  position: number;
}

export class StatusTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: [StatusTemplateItemResponseDto] })
  statuses: StatusTemplateItemResponseDto[];

  @ApiProperty({ nullable: true })
  workspaceId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: StatusTemplate & { items: StatusTemplateItem[] },
  ): StatusTemplateResponseDto {
    const dto = new StatusTemplateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.statuses = entity.items.map((item) => ({
      name: item.name,
      type: item.type,
      color: item.color,
      position: item.position,
    }));
    dto.workspaceId = entity.workspaceId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
