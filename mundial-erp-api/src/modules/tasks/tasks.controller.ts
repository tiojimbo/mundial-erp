import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TasksService } from './tasks.service';
import { TaskFiltersDto } from './dtos/task-filters.dto';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { AssignTaskDto } from './dtos/assign-task.dto';
import { TaskResponseDto } from './dtos/task-response.dto';
import {
  BulkDeleteTasksDto,
  BulkUpdateTasksDto,
} from './dtos/bulk-update-tasks.dto';
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
  @ApiOperation({
    summary:
      'Tasks de um space agrupadas por list (divergencia Mundial). Hoppe agrupa apenas por status via GET /tasks/list?level=space&spaceId. Esse endpoint existe pra UI Mundial que precisa do shape [{list:{id,name,folder?}, tasks[]}]; list.folder pode ser null quando a list e direta no space.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Space nao encontrado' })
  findBySpace(
    @WorkspaceId() workspaceId: string,
    @Param('spaceId') spaceId: string,
  ) {
    return this.tasksService.findBySpace(workspaceId, spaceId);
  }

  @Delete('tasks/:taskId/assignees/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Remove 1 assignee individual (Hoppe)' })
  @ApiResponse({ status: 200, description: 'Assignee removido' })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  removeAssignee(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.removeAssignee(
      workspaceId,
      taskId,
      userId,
      user.sub,
    );
  }

  @Put('tasks/:taskId/assign')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary:
      'Substitui a lista completa de assignees (Hoppe). Vazio recoloca creator',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Task nao encontrada' })
  assign(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: AssignTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.assign(workspaceId, taskId, body, user.sub);
  }

  @Get('tasks/:taskId/assignees')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Assignees de uma task (Hoppe). NOTE: campo `permission` retorna null ate o mapeamento Member* (Sprint 4-5)',
  })
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
    summary: 'Tasks atribuidas ao caller agrupadas por bucket temporal (Hoppe)',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    description: 'Fuso IANA (ex: America/Sao_Paulo). Default UTC',
  })
  @ApiResponse({ status: 200 })
  myTasks(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Query('tz') tz?: string,
  ) {
    return this.tasksService.findMyTasks(workspaceId, user.sub, tz);
  }

  @Get('tasks/list')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Tasks agrupadas por status (Hoppe). Aceita viewId ou level+id',
  })
  @ApiQuery({ name: 'viewId', required: false })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['list', 'folder', 'space'],
  })
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

  @Post('tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar task (estilo Hoppe, listId no body)' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Payload invalido' })
  @ApiResponse({
    status: 404,
    description: 'List nao encontrada (ou cross-tenant)',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() body: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.create(workspaceId, body, user.sub);
  }

  // IMPORTANTE: rotas com path fixo (`tasks/bulk`) precisam vir ANTES das
  // rotas com `:taskId`. O matcher do NestJS resolve na ordem de declaracao;
  // se `:taskId` vier primeiro, `DELETE/PUT /tasks/bulk` cai no handler
  // single com taskId="bulk" e o bulk nunca executa.
  @Put('tasks/bulk')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Bulk update de tasks (Hoppe-style)' })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  bulkUpdate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkUpdateTasksDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.bulkUpdate(workspaceId, dto.tasks, user.sub);
  }

  @Delete('tasks/bulk')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Bulk delete de tasks (Hoppe-style)' })
  @ApiResponse({ status: 200 })
  bulkDelete(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkDeleteTasksDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.bulkDelete(workspaceId, dto.taskIds, user.sub);
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
  @ApiOperation({
    summary: 'Atualizacao de task (PUT estilo Hoppe, partial body)',
  })
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
}
