import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

/**
 * Patch additive/subtractive para colecoes (PLANO-TASKS.md §7.1).
 * Itens em `add` sao incluidos; em `rem` sao removidos; intersecao idempotente.
 */
export class AddRemoveIdsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  add?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rem?: string[];
}

/**
 * `PUT /tasks/:taskId` (HPP-050/059, partial body estilo Hoppe).
 * Todos campos opcionais. Mutacoes de colecao via `AddRemoveIdsDto`.
 *
 * HPP-059: `assignees, assigneeIds, addAssigneeIds, assigneeId` sao
 * rejeitados pelo ValidationPipe global (forbidNonWhitelisted). Use
 * `PUT /tasks/:id/assign` para substituir assignees.
 */
export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional({ description: 'Conteudo markdown estruturado' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  markdownContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 999.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customTypeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processId?: string;

  @ApiPropertyOptional({ description: 'Alias Hoppe de processId.' })
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional({ type: AddRemoveIdsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddRemoveIdsDto)
  watchers?: AddRemoveIdsDto;

  @ApiPropertyOptional({ type: AddRemoveIdsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddRemoveIdsDto)
  tagIds?: AddRemoveIdsDto;
}
