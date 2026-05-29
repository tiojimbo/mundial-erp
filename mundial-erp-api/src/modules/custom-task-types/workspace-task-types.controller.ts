import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CustomTaskTypesService } from './custom-task-types.service';
import { CustomTaskTypeResponseDto } from './dtos/custom-task-type-response.dto';

import { SkipWorkspaceGuard } from '../workspaces/decorators/skip-workspace-guard.decorator';

@ApiTags('Custom Task Types')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/task-types')
export class WorkspaceTaskTypesController {
  constructor(private readonly service: CustomTaskTypesService) {}

  @Get()
  @SkipWorkspaceGuard()
  @ApiOperation({
    summary:
      'Lista flat de todos os custom task types do workspace (Hoppe-style)',
  })
  @ApiResponse({ status: 200, type: [CustomTaskTypeResponseDto] })
  list(@Param('workspaceId') workspaceId: string) {
    return this.service.listFlatForWorkspace(workspaceId);
  }
}
