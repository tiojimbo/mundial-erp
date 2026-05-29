import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TaskActivitiesService } from './task-activities.service';
import { ActivityFiltersDto } from './dtos/activity-filters.dto';
import { ActivitiesListResponseDto } from './dtos/activity-response.dto';

import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Task Activities')
@ApiBearerAuth()
@Controller()
export class TaskActivitiesController {
  constructor(private readonly service: TaskActivitiesService) {}

  @Get('tasks-activities/:taskId')
  @SkipResponseTransform()
  @ApiOperation({
    summary:
      'Feed de atividades da tarefa (paginado, orderBy createdAt DESC, path Hoppe)',
  })
  @ApiResponse({ status: 200, type: ActivitiesListResponseDto })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Query() filters: ActivityFiltersDto,
  ): Promise<ActivitiesListResponseDto> {
    return this.service.findByTask(workspaceId, taskId, filters);
  }
}
