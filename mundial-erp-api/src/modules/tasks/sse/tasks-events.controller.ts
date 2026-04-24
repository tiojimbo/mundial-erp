/**
 * TasksEventsController — rota SSE `/tasks/:taskId/events` (PLANO-TASKS §7.5).
 *
 * Responsabilidade UNICA: delegacao + kill switch do feature flag
 * `TASKS_SSE_ENABLED`. A orquestracao (replay + live + heartbeat) vive
 * inteira em `TasksEventsService` (§2 Regras Invioláveis).
 *
 * Guards:
 *   - `SseJwtGuard` substitui o `JwtAuthGuard` global para aceitar token
 *     via query (limitacao do `EventSource` nativo).
 *   - `WorkspaceGuard` continua ativo e valida membership do workspaceId
 *     embutido no JWT.
 *
 * Throttle: 10 conexoes/min/user — limite superior complementa o cap de
 * 3 conexoes simultaneas enforcado pelo cliente (`tasks.store`). Protege
 * contra loops de reconnect descontrolados.
 *
 * @Sse decorator do NestJS: cada valor emitido pelo Observable e serializado
 * como frame `event:...\ndata:...\nid:...\n\n` automaticamente.
 */

import {
  Controller,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Query,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SseJwtGuard } from '../../auth/guards/sse-jwt.guard';
import { WorkspaceId } from '../../workspaces/decorators/workspace-id.decorator';
import { WorkspaceGuard } from '../../workspaces/guards/workspace.guard';
import { TasksEventsService } from './tasks-events.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksEventsController {
  constructor(
    private readonly service: TasksEventsService,
    private readonly config: ConfigService,
  ) {}

  @Sse(':taskId/events')
  @UseGuards(SseJwtGuard, WorkspaceGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Stream SSE de eventos de uma task (activity.created, task.updated, ...)',
  })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiQuery({
    name: 'lastEventId',
    required: false,
    description: 'ISO 8601 do ultimo evento visto — replay idempotente',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'JWT access token (EventSource nao aceita header)',
  })
  stream(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @WorkspaceId() workspaceId: string,
    @Query('lastEventId') lastEventId?: string,
  ): Observable<MessageEvent> {
    // Kill switch: `TASKS_SSE_ENABLED=false` retorna 501 imediatamente.
    // Separado do `TASKS_V2_ENABLED` (que afeta toda a feature) para permitir
    // desligar SSE isoladamente sem derrubar REST.
    const enabled = this.config.get<boolean>('TASKS_SSE_ENABLED');
    if (enabled === false) {
      throw new NotImplementedException('SSE desabilitado');
    }
    return this.service.stream(taskId, workspaceId, lastEventId);
  }
}
