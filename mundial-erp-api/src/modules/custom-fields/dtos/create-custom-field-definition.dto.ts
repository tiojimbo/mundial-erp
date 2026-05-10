import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Slug semantico do field (key). Lowercase, separador underscore, sem espacos.
 * Documentado aqui para ser reutilizado entre frontend e seeds.
 */
const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

export class CreateCustomFieldDefinitionDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'client_cnpj',
    description:
      'Slug semantico [a-z][a-z0-9_]*. Unico por workspace (ou globalmente para builtin).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(KEY_REGEX, {
    message: 'key deve seguir o padrao [a-z][a-z0-9_]*',
  })
  key!: string;

  @ApiProperty({ minLength: 1, maxLength: 120, example: 'CNPJ do cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.CNPJ })
  @IsEnum(CustomFieldType)
  type!: CustomFieldType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description:
      'Configuracao tipo-dependente: {options, min, max, hint, readOnly, requiredWhen}.',
    example: { options: [{ value: 'pix', label: 'Pix' }] },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    minimum: 0,
    default: 0,
    description: 'Ordem em listagens cheias (definicoes do workspace).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Escopo: limitar a um Space' })
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional({ description: 'Escopo: limitar a um Folder' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Escopo: limitar a uma List' })
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional({ description: 'Escopo: limitar a um CustomTaskType' })
  @IsOptional()
  @IsString()
  customTaskTypeId?: string;
}
