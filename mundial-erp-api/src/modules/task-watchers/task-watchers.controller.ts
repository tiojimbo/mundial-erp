import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskWatchersService } from './task-watchers.service';
import { WatcherResponseDto } from './dtos/watcher-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `WorkItemWatcher` (PLANO-TASKS.md §7.3 — Watchers).
 *
 * Semantica de autorizacao:
 *   - Viewer+ pode listar watchers de uma tarefa que enxerga.
 *   - Operator+ pode alterar seu proprio status de watcher (self-add/remove).
 *   - Somente Manager+ pode adicionar/remover watchers de terceiros.
 *     (Esse gate adicional e feito no Service porque depende do `actor.userId`
 *     vs `targetUserId`, que o RolesGuard nao conhece — o RolesGuard aqui
 *     apenas abre a porta para Operator+; o Service refina.)
 *
 * Cross-tenant → 404 (nunca 403), para nao vazar existencia de recursos.
 *
 * Os guards globais (JwtAuth, Workspace, Roles) ja sao aplicados via
 * APP_GUARD em app.module.ts; repetimos aqui com @UseGuards explicito para
 * tornar a contrato-seguranca explicita no ponto de leitura do controller
 * e facilitar testes isolados (supertest com modulo reduzido).
 */
@ApiTags('Task Watchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class TaskWatchersController {
  constructor(private readonly service: TaskWatchersService) {}

  @Get('tasks/:taskId/watchers')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar watchers de uma tarefa' })
  @ApiResponse({ status: 200, type: WatcherResponseDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  list(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<WatcherResponseDto[]> {
    return this.service.listWatchers(workspaceId, taskId);
  }

  @Post('tasks/:taskId/watchers/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Adicionar watcher (self-add aberto; add-other exige Manager+)',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Apenas Manager+ pode adicionar terceiros',
  })
  @ApiResponse({ status: 404, description: 'Tarefa ou usuario nao encontrado' })
  add(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.addWatcher(workspaceId, taskId, userId, {
      userId: user.sub,
      role: user.role as Role,
    });
  }

  @Delete('tasks/:taskId/watchers/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Remover watcher (self-remove aberto; remove-other exige Manager+)',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Apenas Manager+ pode remover terceiros',
  })
  @ApiResponse({ status: 404, description: 'Tarefa ou usuario nao encontrado' })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.removeWatcher(workspaceId, taskId, userId, {
      userId: user.sub,
      role: user.role as Role,
    });
  }
}
