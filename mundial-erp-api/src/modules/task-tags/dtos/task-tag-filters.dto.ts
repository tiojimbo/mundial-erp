import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class TaskTagFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'urg' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
