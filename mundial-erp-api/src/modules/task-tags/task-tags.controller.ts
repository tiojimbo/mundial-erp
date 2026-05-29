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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskTagsService } from './task-tags.service';
import { CreateTaskTagDto } from './dtos/create-task-tag.dto';
import { UpdateTaskTagDto } from './dtos/update-task-tag.dto';
import { TaskTagResponseDto } from './dtos/task-tag-response.dto';
import { TaskTagFiltersDto } from './dtos/task-tag-filters.dto';
import { AttachTagDto } from './dtos/attach-tag.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `WorkItemTag` no padrao Hoppe:
 * - `/tags` CRUD (HPP-085)
 * - `/tags/task/:taskId` attach/detach (HPP-086)
 */
@ApiTags('Tags')
@ApiBearerAuth()
@Controller()
export class TaskTagsController {
  constructor(private readonly service: TaskTagsService) {}

  @Get('tags')
  @ApiOperation({ summary: 'Listar tags do workspace' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filters: TaskTagFiltersDto,
  ) {
    return this.service.findAll(workspaceId, filters);
  }

  @Post('tags')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Criar tag (spaceId obrigatorio)' })
  @ApiResponse({ status: 201, type: TaskTagResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Nome ja existe (case-insensitive)',
  })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateTaskTagDto) {
    return this.service.create(workspaceId, dto);
  }

  @Put('tags/:id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Editar tag' })
  @ApiResponse({ status: 200, type: TaskTagResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskTagDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }

  @Delete('tags/:id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tag (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }

  @Post('tags/task/:taskId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Associar tag a uma tarefa' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa ou tag nao encontrada' })
  attach(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: AttachTagDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.attach(workspaceId, taskId, dto.tagId, user.sub);
  }

  @Delete('tags/task/:taskId/:tagId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
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
