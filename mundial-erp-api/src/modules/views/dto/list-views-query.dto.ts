import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class ListViewsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'cuid-da-lista' })
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional({ example: 'cuid-do-folder' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ example: 'cuid-do-space' })
  @IsOptional()
  @IsString()
  spaceId?: string;
}
