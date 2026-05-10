import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskLinksService } from './task-links.service';
import { CreateLinkDto } from './dtos/create-link.dto';
import {
  TaskLinksResponseDto,
  WorkItemLinkItemDto,
} from './dtos/link-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Task Links')
@ApiBearerAuth()
@Controller()
export class TaskLinksController {
  constructor(private readonly service: TaskLinksService) {}

  @Get('tasks/:taskId/links')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar links da tarefa (perspectiva da task)' })
  @ApiResponse({ status: 200, type: TaskLinksResponseDto })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.findAll(workspaceId, taskId);
  }

  @Post('tasks/:taskId/links')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar link entre duas tarefas' })
  @ApiResponse({ status: 201, type: WorkItemLinkItemDto })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateLinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(workspaceId, taskId, dto, user.sub);
  }

  @Delete('tasks/:taskId/links/:linkId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remover link pela primary key' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Link nao encontrado' })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(workspaceId, taskId, linkId, user.sub);
  }
}
