import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

/**
 * Filtros de listagem de CustomTaskType. Paginacao herdada e busca por nome
 * opcional (case-insensitive). Ver PLANO-TASKS.md §7.3.
 */
export class CustomTaskTypeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'milestone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
