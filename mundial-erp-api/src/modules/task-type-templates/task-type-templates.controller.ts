import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TaskTypeTemplatesService } from './task-type-templates.service';
import { TaskTypeTemplatesGuard } from './task-type-templates.guard';
import { TaskTypeTemplateResponseDto } from './dtos/task-type-template-response.dto';
import { Roles } from '../../common/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Endpoints read-only de Task Type Templates (M2 — Sprint 3 TTT-031).
 *
 * Guards:
 *   - Globais: JwtAuth + Workspace + Roles + Throttler (registrados em
 *     `app.module.ts` via APP_GUARD).
 *   - Local: `TaskTypeTemplatesGuard` (kill switch
 *     `FEATURE_TASK_TYPE_TEMPLATES_ENABLED`). OFF -> 404 nas duas rotas.
 *
 * RBAC: Viewer+ (read-only). Sem mutacao nesta sprint.
 *
 * Cross-tenant: enforcement no service via filtro
 * `(workspaceId IS NULL OR workspaceId = current)` no `CustomTaskType` pai.
 * Cross-tenant -> 404 (PLANO §"Boundaries de modulo backend"; 99-referencia §8.1).
 */
@ApiTags('Task Type Templates')
@ApiBearerAuth()
@UseGuards(TaskTypeTemplatesGuard)
@Controller('task-type-templates')
export class TaskTypeTemplatesController {
  constructor(private readonly service: TaskTypeTemplatesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Lista templates visiveis ao workspace (builtins globais + proprios)',
  })
  @ApiResponse({
    status: 200,
    type: TaskTypeTemplateResponseDto,
    isArray: true,
  })
  list(
    @WorkspaceId() workspaceId: string,
  ): Promise<TaskTypeTemplateResponseDto[]> {
    return this.service.list(workspaceId);
  }

  @Get(':customTaskTypeId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Busca o template (1:1) associado a um CustomTaskType. Cross-tenant -> 404.',
  })
  @ApiResponse({ status: 200, type: TaskTypeTemplateResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Template nao encontrado ou nao visivel ao workspace',
  })
  findByCustomTaskTypeId(
    @WorkspaceId() workspaceId: string,
    @Param('customTaskTypeId') customTaskTypeId: string,
  ): Promise<TaskTypeTemplateResponseDto> {
    return this.service.findByCustomTaskTypeId(customTaskTypeId, workspaceId);
  }
}
