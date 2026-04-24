import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskTemplateScope } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Filtros de `GET /task-templates` — PLANO-TASKS.md §7.3.
 *
 * Default page=20, limit max=100. `search` aplica ILIKE no `name` do template
 * (repositorio restringe via `mode: 'insensitive'`).
 */
export class TemplateFiltersDto {
  @ApiPropertyOptional({ enum: TaskTemplateScope })
  @IsOptional()
  @IsEnum(TaskTemplateScope)
  scope?: TaskTemplateScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processId?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
