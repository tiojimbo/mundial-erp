import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

/**
 * Parse CSV ou array JSON em array de strings para filtros `*Ids[]`.
 * Aceita `?processIds=a,b,c` e `?processIds=a&processIds=b` uniformemente.
 */
function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((v) => v.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return undefined;
}

/** Whitelist estrita de campos ordenaveis (CTO note §7.1). */
export const TASK_ORDER_BY_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'dueDate',
  'priority',
  'sortOrder',
  'points',
] as const;

export type TaskOrderBy = (typeof TASK_ORDER_BY_FIELDS)[number];

/**
 * Filtros de `GET /tasks` workspace-wide (PLANO-TASKS.md §7.1).
 * Todos os campos sao opcionais. Arrays aceitam CSV ou multi-valor.
 *
 * Paginacao:
 *  - offset: `page`+`limit` (default).
 *  - cursor: `cursor`+`limit` — opaco (id da ultima task visivel).
 */
export class TaskFiltersDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  @ApiPropertyOptional({ description: 'Cursor opaco (id da ultima task)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  processIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  areaIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'statusIds' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  statuses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  customTypeIds?: string[];

  @ApiPropertyOptional({ enum: TaskPriority, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateGt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateLt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdGt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdLt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedGt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedLt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ enum: TASK_ORDER_BY_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(TASK_ORDER_BY_FIELDS as unknown as string[])
  orderBy: TaskOrderBy = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeClosed?: boolean = false;
}
