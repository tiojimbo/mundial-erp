import {
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
import { TaskLinksResponseDto } from './dtos/link-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `WorkItemLink` — PLANO-TASKS.md §7.3 (Links simetricos).
 *
 * Rotas POST/DELETE usam os dois ids no path porque:
 *   1) nao ha "payload" — a aresta inteira e definida pelos enderecos;
 *   2) deixa a intencao idempotente (mesmo par -> mesma operacao).
 */
@ApiTags('Task Links')
@ApiBearerAuth()
@Controller()
export class TaskLinksController {
  constructor(private readonly service: TaskLinksService) {}

  @Get('tasks/:taskId/links')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar links simetricos da tarefa' })
  @ApiResponse({ status: 200, type: TaskLinksResponseDto })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.findAll(workspaceId, taskId);
  }

  @Post('tasks/:taskId/links/:linksToId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar link simetrico entre duas tarefas' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('linksToId') linksToId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(workspaceId, taskId, linksToId, user.sub);
  }

  @Delete('tasks/:taskId/links/:linksToId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remover link simetrico' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('linksToId') linksToId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(workspaceId, taskId, linksToId, user.sub);
  }
}
