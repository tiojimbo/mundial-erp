import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type CreatorEmbed = { id: string; name: string; email: string } | null;

type CustomTaskTypeEntityLike = {
  id: string;
  workspaceId: string | null;
  spaceId: string | null;
  creatorId: string | null;
  name: string;
  namePlural: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  avatarUrl: string | null;
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: { id: string; name: string; email: string } | null;
};

export class CustomTaskTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  workspaceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  spaceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  creatorId!: string | null;

  @ApiProperty()
  value!: string;

  @ApiPropertyOptional({ nullable: true })
  pluralName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiPropertyOptional({ nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  isBuiltin!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  creator!: CreatorEmbed;

  static fromEntity(
    entity: CustomTaskTypeEntityLike,
  ): CustomTaskTypeResponseDto {
    const dto = new CustomTaskTypeResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.spaceId = entity.spaceId;
    dto.creatorId = entity.creatorId;
    dto.value = entity.name;
    dto.pluralName = entity.namePlural;
    dto.description = entity.description;
    dto.icon = entity.icon;
    dto.color = entity.color;
    dto.avatarUrl = entity.avatarUrl;
    dto.isBuiltin = entity.isBuiltin;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.creator = entity.creator ?? null;
    return dto;
  }
}
