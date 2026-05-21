import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { DropdownOptionDto } from './dropdown-option.dto';

const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

export class CreateCustomFieldDefinitionDto {
  @ApiProperty({ minLength: 1, maxLength: 120, example: 'CNPJ do cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description:
      'Slug interno [a-z][a-z0-9_]*. Quando omitido, e derivado de `name`.',
    example: 'cnpj_cliente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(KEY_REGEX, {
    message: 'key deve seguir o padrao [a-z][a-z0-9_]*',
  })
  key?: string;

  @ApiProperty({
    description: 'Legenda exibida no editor (paridade Hoppe — obrigatorio).',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({ description: 'Descricao livre do campo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.CNPJ })
  @IsEnum(CustomFieldType)
  type!: CustomFieldType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description:
      'Options Hoppe-style na raiz. Array de objetos {value, label?, color?}. Obrigatorio para LABEL.',
    type: () => DropdownOptionDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DropdownOptionDto)
  options?: DropdownOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visibleToGuests?: boolean;

  @ApiPropertyOptional({ default: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  fillMethod?: string;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Alias deprecated de `position`.' })
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

  @ApiPropertyOptional({
    description:
      'Escopo: limitar a um CustomTaskType (alias: customTaskTypeId)',
  })
  @IsOptional()
  @IsString()
  taskTypeId?: string;

  @ApiPropertyOptional({ description: 'Alias de `taskTypeId`.' })
  @IsOptional()
  @IsString()
  customTaskTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  groupPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupColor?: string;
}
