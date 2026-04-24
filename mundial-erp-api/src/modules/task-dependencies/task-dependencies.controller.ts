import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskDependenciesService } from './task-dependencies.service';
import { CreateDependencyDto } from './dtos/create-dependency.dto';
import { DeleteDependencyQueryDto } from './dtos/delete-dependency.query.dto';
import { TaskDependenciesResponseDto } from './dtos/task-dependency-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `WorkItemDependency` — PLANO-TASKS.md §7.3 R1-R4.
 *
 * Rotas aninhadas em `/tasks/:taskId/dependencies` (recurso da task, nao
 * CRUD independente). Body/query obrigam EXATAMENTE UM de
 * `dependsOn`/`dependencyOf`, via validator no DTO.
 */
@ApiTags('Task Dependencies')
@ApiBearerAuth()
@Controller()
export class TaskDependenciesController {
  constructor(private readonly service: TaskDependenciesService) {}

  @Get('tasks/:taskId/dependencies')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Listar dependencias da tarefa (blocking + waitingOn)',
  })
  @ApiResponse({ status: 200, type: TaskDependenciesResponseDto })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.findAll(workspaceId, taskId);
  }

  @Post('tasks/:taskId/dependencies')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Adicionar dependencia (EXATAMENTE UM de dependsOn/dependencyOf)',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Ciclo detectado ou aresta ja existe',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateDependencyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(workspaceId, taskId, dto, user.sub);
  }

  @Delete('tasks/:taskId/dependencies')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Remover dependencia (EXATAMENTE UM de dependsOn/dependencyOf via query)',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Query() query: DeleteDependencyQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(workspaceId, taskId, query, user.sub);
  }
}
