import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

/**
 * `POST /processes/:processId/tasks` (PLANO-TASKS.md §7.2).
 *
 * DTO dedicado da fachada Tasks — NAO reusa `CreateWorkItemDto` (99-referencia
 * regra 3: DTOs dedicados por modulo). Campos escalares seguem `UpdateTaskDto`
 * em nomenclatura e validacoes; colecoes vem como arrays simples (create
 * inicial, sem delta `{add,rem}`).
 *
 * ADR-001: `primaryAssigneeCache` NUNCA e setado pela aplicacao. `assignees`
 * e aplicado via `AssigneesSyncService` apos o create e a Prisma extension
 * recalcula o cache a partir de `work_item_assignees`.
 */
export class CreateTaskDto {
  @ApiProperty({ minLength: 3, maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5_000 })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  description?: string;

  @ApiPropertyOptional({ description: 'Conteudo markdown estruturado' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  markdownContent?: string;

  /**
   * Quando omitido, o service resolve o primeiro `WorkflowStatus` com
   * `category=NOT_STARTED` do departamento do process.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ minimum: 0 })
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
  @IsString()
  customTypeId?: string;

  @ApiPropertyOptional({ description: 'Parent task id para criar como subtask' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs iniciais de usuarios como assignees (primary = primeiro apos recalculo pela extension)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  assignees?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  watchers?: string[];
}
