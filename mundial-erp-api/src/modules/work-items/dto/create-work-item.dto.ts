import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TaskPriority, WorkItemType } from '@prisma/client';

export class CreateWorkItemDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  processId: string;

  @ApiProperty({ example: 'Implementar funcionalidade X' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: 'Descrição detalhada da tarefa' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  statusId: string;

  @ApiPropertyOptional({ enum: WorkItemType, default: WorkItemType.TASK })
  @IsOptional()
  @IsEnum(WorkItemType)
  itemType?: WorkItemType;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NONE })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;
}
