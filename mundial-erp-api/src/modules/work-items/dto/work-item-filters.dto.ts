import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskPriority, WorkItemType } from '@prisma/client';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class WorkItemFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  processId?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  statusId?: string;

  /**
   * Filtro externo mantido como `assigneeId` (ADR-001). Service mapeia para o
   * campo Prisma renomeado `primaryAssigneeCache`.
   */
  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: WorkItemType })
  @IsOptional()
  @IsEnum(WorkItemType)
  itemType?: WorkItemType;

  @ApiPropertyOptional({ example: 'buscar texto' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showClosed?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showSubtasks?: boolean = false;
}
