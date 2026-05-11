import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListCustomFieldsQueryDto {
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
