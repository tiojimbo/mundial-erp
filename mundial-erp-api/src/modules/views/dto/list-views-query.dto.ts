import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class ListViewsQueryDto extends PaginationDto {
  @ApiProperty({ example: 'cuid-do-processo' })
  @IsString()
  @MinLength(1)
  listId!: string;
}
