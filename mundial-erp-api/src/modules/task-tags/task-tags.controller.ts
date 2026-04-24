import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { TaskTagsService } from './task-tags.service';
import { CreateTaskTagDto } from './dtos/create-task-tag.dto';
import { UpdateTaskTagDto } from './dtos/update-task-tag.dto';
import { TaskTagResponseDto } from './dtos/task-tag-response.dto';
import { TaskTagFiltersDto } from './dtos/task-tag-filters.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `WorkItemTag`.
 *
 * Usa prefixos distintos no nivel de metodo (via `@Get('/task-tags')` etc.)
 * ao inves de um prefixo global, porque o recurso tem duas familias de URLs:
 * CRUD em `/task-tags` e attach/detach em `/tasks/:taskId/tags/:tagId`.
 *
 * PLANO-TASKS.md §7.3: Tags.
 */
@ApiTags('Task Tags')
@ApiBearerAuth()
@Controller()
export class TaskTagsController {
  constructor(private readonly service: TaskTagsService) {}

  @Get('task-tags')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar tags do workspace' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filters: TaskTagFiltersDto,
  ) {
    return this.service.findAll(workspaceId, filters);
  }

  @Post('task-tags')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar tag' })
  @ApiResponse({ status: 201, type: TaskTagResponseDto })
  @ApiResponse({ status: 409, description: 'Nome ja existe (case-insensitive)' })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTaskTagDto,
  ) {
    return this.service.create(workspaceId, dto);
  }

  @Patch('task-tags/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Editar tag' })
  @ApiResponse({ status: 200, type: TaskTagResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskTagDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }

  @Delete('task-tags/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tag (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }

  @Post('tasks/:taskId/tags/:tagId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Associar tag a uma tarefa' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa ou tag nao encontrada' })
  attach(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.attach(workspaceId, taskId, tagId, user.sub);
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remover associacao tag/tarefa' })
  @ApiResponse({ status: 204 })
  detach(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.detach(workspaceId, taskId, tagId, user.sub);
  }
}
