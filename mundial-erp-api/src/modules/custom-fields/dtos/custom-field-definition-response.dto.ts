import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import type { CustomFieldDefinition } from '@prisma/client';

/**
 * Response DTO para `CustomFieldDefinition`.
 *
 * `workspaceId` e exposto apenas quando o caller eh membro do workspace
 * dono. Builtins (workspaceId NULL) sao visiveis a todos. O service e
 * responsavel por aplicar essa regra antes de instanciar o DTO.
 */
export class CustomFieldDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  workspaceId!: string | null;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: CustomFieldType, enumName: 'CustomFieldType' })
  type!: CustomFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional({ nullable: true })
  config!: Record<string, unknown> | null;

  @ApiProperty()
  isBuiltin!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    entity: CustomFieldDefinition,
    options: { exposeWorkspaceId: boolean } = { exposeWorkspaceId: true },
  ): CustomFieldDefinitionResponseDto {
    const dto = new CustomFieldDefinitionResponseDto();
    dto.id = entity.id;
    // Regras de exposicao (PLANO §"DTOs com class-validator"):
    //  - builtin (workspaceId NULL) -> sempre exposto como `null`.
    //  - definition do proprio workspace -> exposto.
    //  - cross-tenant -> nao deveria chegar aqui (service filtra antes).
    //    Se acontecer, omitimos o id por seguranca defensiva.
    dto.workspaceId =
      entity.workspaceId === null || options.exposeWorkspaceId
        ? entity.workspaceId
        : null;
    dto.key = entity.key;
    dto.label = entity.label;
    dto.type = entity.type;
    dto.required = entity.required;
    dto.config = (entity.config as Record<string, unknown> | null) ?? null;
    dto.isBuiltin = entity.isBuiltin;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
