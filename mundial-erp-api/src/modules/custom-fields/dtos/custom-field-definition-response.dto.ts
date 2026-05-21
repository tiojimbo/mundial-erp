import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import type { CustomFieldDefinition, CustomFieldGroup } from '@prisma/client';

export interface CreatorEmbed {
  id: string;
  name: string;
  email: string;
}

export interface GroupEmbed {
  id: string;
  name: string;
  position: number;
  color: string | null;
}

export class CustomFieldDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  workspaceId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: CustomFieldType, enumName: 'CustomFieldType' })
  type!: CustomFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiProperty({ type: [Object] })
  options!: unknown[];

  @ApiPropertyOptional({ nullable: true })
  config!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  defaultValue!: unknown;

  @ApiPropertyOptional({ nullable: true })
  validation!: Record<string, unknown> | null;

  @ApiProperty()
  pinned!: boolean;

  @ApiProperty()
  visibleToGuests!: boolean;

  @ApiProperty()
  fillMethod!: string;

  @ApiProperty()
  fixed!: boolean;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({ nullable: true })
  spaceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  folderId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  listId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  taskTypeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdById!: string | null;

  @ApiPropertyOptional({ nullable: true })
  creator!: CreatorEmbed | null;

  @ApiPropertyOptional({ nullable: true })
  groupId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  groupName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  groupPosition!: number | null;

  @ApiPropertyOptional({ nullable: true })
  groupColor!: string | null;

  @ApiPropertyOptional({ nullable: true })
  group!: GroupEmbed | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    entity: CustomFieldDefinition & {
      createdBy?: CreatorEmbed | null;
      group?: CustomFieldGroup | null;
    },
    options: { exposeWorkspaceId: boolean } = { exposeWorkspaceId: true },
  ): CustomFieldDefinitionResponseDto {
    const dto = new CustomFieldDefinitionResponseDto();
    dto.id = entity.id;
    dto.workspaceId =
      entity.workspaceId === null || options.exposeWorkspaceId
        ? entity.workspaceId
        : null;
    dto.name = entity.name;
    dto.label = entity.label;
    dto.description = entity.description;
    dto.type = entity.type;
    dto.required = entity.required;
    dto.options = Array.isArray(entity.options) ? entity.options : [];
    dto.config = (entity.config as Record<string, unknown> | null) ?? null;
    dto.defaultValue = entity.defaultValue ?? null;
    dto.validation =
      (entity.validation as Record<string, unknown> | null) ?? null;
    dto.pinned = entity.pinned;
    dto.visibleToGuests = entity.visibleToGuests;
    dto.fillMethod = entity.fillMethod;
    dto.fixed = entity.isBuiltin;
    dto.position = entity.sortOrder;
    dto.spaceId = entity.spaceId;
    dto.folderId = entity.folderId;
    dto.listId = entity.listId;
    dto.taskTypeId = entity.customTaskTypeId;
    dto.createdById = entity.createdById;
    dto.creator = entity.createdBy
      ? {
          id: entity.createdBy.id,
          name: entity.createdBy.name,
          email: entity.createdBy.email,
        }
      : null;
    dto.groupId = entity.groupId;
    dto.groupName = entity.groupName;
    dto.groupPosition = entity.groupPosition;
    dto.groupColor = entity.groupColor;
    dto.group = entity.group
      ? {
          id: entity.group.id,
          name: entity.group.name,
          position: entity.group.position,
          color: entity.group.color,
        }
      : null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
