import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TasksService } from './tasks.service';
import { TaskFiltersDto } from './dtos/task-filters.dto';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { MergeTasksDto } from './dtos/merge-tasks.dto';
import { TimeInStatusBulkDto } from './dtos/time-in-status-bulk.dto';
import { TaskResponseDto } from './dtos/task-response.dto';
import { TaskDetailResponseDto } from './dtos/task-detail-response.dto';
import { ParseTaskIncludePipe } from './pipes/parse-task-include.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { TasksFeatureFlagGuard } from '../../common/feature-flags/tasks-feature-flag.guard';

/**
 * Controller de Tasks (PLANO-TASKS.md §7.1–7.2).
 *
 * Envelope `{data, meta}` canonico. Guards Jwt+Workspace+Roles sao globais
 * (ver `app.module.ts`), portanto este controller usa apenas `@Roles()`.
 * Viewer: GET. Operator+: mutacoes. Manager+: destrutivas (merge/delete).
 *
 * `TasksFeatureFlagGuard` aplicado a nivel de classe: todas as rotas /tasks/*
 * respeitam o kill switch global `TASKS_V2_ENABLED` e o opt-out por workspace
 * (`TASKS_V2_DISABLED_WORKSPACES` + `workspace.settings.tasksV2Enabled`). Ver
 * PLANO-TASKS.md §9.1 e o README do modulo.
 */
@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(TasksFeatureFlagGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar tasks (workspace-wide, filtros completos)' })
  list(@WorkspaceId() workspaceId: string, @Query() filters: TaskFiltersDto) {
    return this.tasksService.list(workspaceId, filters);
  }

  @Post('processes/:processId/tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar task em um processo' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Payload invalido' })
  @ApiResponse({
    status: 404,
    description: 'Process nao encontrado (ou cross-tenant)',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('processId') processId: string,
    @Body() body: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.create(workspaceId, processId, body, user.sub);
  }

  @Get('tasks/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Detalhe de uma task (include whitelist)' })
  @ApiQuery({
    name: 'include',
    required: false,
    description:
      'CSV: subtasks,checklists,dependencies,links,tags,watchers,attachments,markdown,assignees',
  })
  @ApiResponse({ status: 200, type: TaskDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  findById(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Query('include', ParseTaskIncludePipe) includes: ReadonlySet<string>,
  ) {
    return this.tasksService.findById(workspaceId, taskId, includes);
  }

  @Patch('tasks/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizacao parcial de task' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.update(workspaceId, taskId, body, user.sub);
  }

  @Delete('tasks/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (idempotente — 204)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('taskId') taskId: string) {
    return this.tasksService.remove(workspaceId, taskId);
  }

  @Post('tasks/:taskId/archive')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Arquivar task (reversivel)' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  archive(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.archive(workspaceId, taskId, user.sub);
  }

  @Post('tasks/:taskId/unarchive')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Desarquivar task' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  unarchive(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.unarchive(workspaceId, taskId, user.sub);
  }

  @Get('tasks/:taskId/time-in-status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Tempo acumulado por status de uma task' })
  timeInStatus(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.timeInStatus(workspaceId, taskId);
  }

  @Post('tasks/time-in-status:bulk')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tempo por status em lote (max 100 ids)' })
  timeInStatusBulk(
    @WorkspaceId() workspaceId: string,
    @Body() body: TimeInStatusBulkDto,
  ) {
    return this.tasksService.timeInStatusBulk(workspaceId, body.taskIds);
  }

  @Post('tasks/:taskId/merge')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Merge de 1-50 sources no target (transacional, idempotente via header)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Chave opaca para replay seguro (TTL 24h). Repeticao retorna resultado cacheado com meta.idempotent=true.',
  })
  @ApiResponse({ status: 200, description: 'Merge aplicado' })
  @ApiResponse({ status: 404, description: 'Target ou source nao encontrada' })
  @ApiResponse({
    status: 409,
    description: 'MergeCycle (target descendente) ou source ja mergida',
  })
  merge(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: MergeTasksDto,
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.tasksService.merge(
      workspaceId,
      taskId,
      body,
      user.sub,
      idempotencyKey,
    );
  }

}
