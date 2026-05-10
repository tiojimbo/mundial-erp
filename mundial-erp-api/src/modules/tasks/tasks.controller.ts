import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

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
@SkipResponseTransform()
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar tasks (workspace-wide, filtros completos)' })
  list(@WorkspaceId() workspaceId: string, @Query() filters: TaskFiltersDto) {
    return this.tasksService.list(workspaceId, filters);
  }

  @Get('tasks/space/:spaceId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Tasks de um space agrupadas por list (Hoppe)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Space nao encontrado' })
  findBySpace(
    @WorkspaceId() workspaceId: string,
    @Param('spaceId') spaceId: string,
  ) {
    return this.tasksService.findBySpace(workspaceId, spaceId);
  }

  @Get('tasks/:taskId/assignees')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Assignees de uma task (Hoppe)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  findAssignees(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findAssignees(workspaceId, taskId);
  }

  @Get('tasks/:taskId/subtasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Subtasks de uma task (Hoppe)' })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  findSubtasks(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findSubtasks(workspaceId, taskId);
  }

  @Get('tasks/my-tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Tasks atribuidas ao caller agrupadas por bucket temporal (Hoppe)',
  })
  @ApiResponse({ status: 200 })
  myTasks(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.findMyTasks(workspaceId, user.sub);
  }

  @Get('tasks/list')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Tasks agrupadas por status (Hoppe). Aceita viewId ou level+id',
  })
  @ApiQuery({ name: 'viewId', required: false })
  @ApiQuery({ name: 'level', required: false, enum: ['list', 'folder', 'space'] })
  @ApiQuery({ name: 'listId', required: false })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'spaceId', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Escopo invalido' })
  @ApiResponse({ status: 404, description: 'View ou escopo nao encontrado' })
  findByListGrouped(
    @WorkspaceId() workspaceId: string,
    @Query('viewId') viewId?: string,
    @Query('level') level?: string,
    @Query('listId') listId?: string,
    @Query('folderId') folderId?: string,
    @Query('spaceId') spaceId?: string,
  ) {
    return this.tasksService.findByListGrouped(workspaceId, {
      viewId,
      level,
      listId,
      folderId,
      spaceId,
    });
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

  @Put('tasks/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizacao de task (PUT estilo Hoppe, partial body)' })
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
  @ApiOperation({ summary: 'Soft delete (idempotente, 200 estilo Hoppe)' })
  @ApiResponse({ status: 200, description: 'Task removida' })
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
