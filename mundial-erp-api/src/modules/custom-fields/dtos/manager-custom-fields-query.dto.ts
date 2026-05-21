import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export type ManagerScope =
  | 'all'
  | 'workspace'
  | 'taskType'
  | 'list'
  | 'folder'
  | 'space';

const MANAGER_SCOPES: ManagerScope[] = [
  'all',
  'workspace',
  'taskType',
  'list',
  'folder',
  'space',
];

export class ManagerCustomFieldsQueryDto {
  @ApiProperty({ enum: MANAGER_SCOPES })
  @IsEnum(MANAGER_SCOPES)
  scope!: ManagerScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskTypeId?: string;
}
