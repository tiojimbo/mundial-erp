/**
 * TasksEventsService — orquestra replay + live + heartbeat do stream SSE
 * `/tasks/:taskId/events` (PLANO-TASKS §7.5 + ADR-002).
 *
 * Fluxo:
 *  1. Valida cross-tenant via `TaskActivitiesRepository.findTaskInWorkspace`.
 *     Task inexistente OU de outro workspace -> 404 (nunca 403, ADR-001 §Red flags).
 *  2. Replay: se o cliente enviou `lastEventId`, busca `WorkItemActivity`
 *     com `createdAt > since` (max 200 rows, hardcap do repository).
 *     Cada row vira `MessageEvent { id, type: 'activity.created', data }`.
 *  3. Live: inscreve no `TaskSseBus` para cada publish do worker apos replay.
 *  4. Heartbeat: MessageEvent sintetico a cada 25s (abaixo do idle timeout
 *     tipico de proxies reversos: Nginx 60s, Cloudflare 100s).
 *  5. Teardown: unsubscribe do bus quando o Observable e cancelado pelo
 *     NestJS (cliente desconecta).
 *
 * Zero Prisma direto: todo acesso via `TaskActivitiesRepository`.
 * Zero `any`: tipagens explicitas em `TaskSseServerEvent` e
 * `ActivityResponseDto`.
 */

import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { from, interval, merge, Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { ActivityResponseDto } from '../../task-activities/dtos/activity-response.dto';
import { TaskActivitiesRepository } from '../../task-activities/task-activities.repository';
import {
  TASK_SSE_BUS,
  type TaskSseBus,
  type TaskSseServerEvent,
} from './task-sse-bus.interface';

/** Intervalo de heartbeat — mantem conexao viva atraves de proxies. */
const HEARTBEAT_INTERVAL_MS = 25_000;

/** Hardcap do replay alinhado ao `MAX_REPLAY_TAKE` do repository (200). */
const REPLAY_TAKE = 200;

@Injectable()
export class TasksEventsService {
  private readonly logger = new Logger(TasksEventsService.name);

  constructor(
    private readonly activitiesRepository: TaskActivitiesRepository,
    @Inject(TASK_SSE_BUS) private readonly bus: TaskSseBus,
    private readonly config: ConfigService,
  ) {
    // ConfigService mantido injetado p/ extensoes futuras (ex: heartbeat
    // configuravel via env). Nao e usado hoje — o kill-switch fica no
    // controller para manter este servico puramente orquestrador.
    void this.config;
  }

  stream(
    taskId: string,
    workspaceId: string,
    lastEventId?: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let cleanup: (() => void) | null = null;
      let active = true;

      // Encadeamento assincrono (guard cross-tenant + replay) empacotado num
      // IIFE para compatibilizar com construtor sincrono do Observable.
      void (async () => {
        try {
          const task = await this.activitiesRepository.findTaskInWorkspace(
            workspaceId,
            taskId,
          );
          if (!task) {
            // 404, nao 403 — nao vaza existencia cross-tenant.
            subscriber.error(new NotFoundException('Task nao encontrada'));
            return;
          }

          if (!active) return;

          const replayEvents = await this.replayEvents(taskId, lastEventId);
          if (!active) return;

          const replay$ = from(replayEvents);
          const live$ = this.liveObservable(taskId, (off) => {
            cleanup = off;
          });
          const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
            map<number, MessageEvent>(() => ({
              type: 'heartbeat',
              data: '',
            })),
          );

          const inner = merge(replay$, live$, heartbeat$)
            .pipe(
              finalize(() => {
                if (cleanup) {
                  cleanup();
                  cleanup = null;
                }
              }),
            )
            .subscribe({
              next: (event) => subscriber.next(event),
              error: (err: unknown) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });

          return () => inner.unsubscribe();
        } catch (err) {
          subscriber.error(err);
        }
      })();

      return () => {
        active = false;
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
      };
    });
  }

  /**
   * Reconstroi eventos perdidos desde `lastEventId` (ISO 8601 timestamp do
   * createdAt da ultima activity conhecida pelo cliente). Hardcap 200 rows.
   */
  private async replayEvents(
    taskId: string,
    lastEventId: string | undefined,
  ): Promise<MessageEvent[]> {
    if (!lastEventId) return [];

    const since = new Date(lastEventId);
    if (Number.isNaN(since.getTime())) {
      this.logger.warn(
        `SSE replay: lastEventId invalido (taskId=${taskId}) — ignorando`,
      );
      return [];
    }

    const rows = await this.activitiesRepository.findAfter(
      taskId,
      since,
      REPLAY_TAKE,
    );

    return rows.map<MessageEvent>((row) => ({
      id: row.createdAt.toISOString(),
      type: 'activity.created',
      data: ActivityResponseDto.fromEntity(row),
    }));
  }

  /**
   * Adapta `TaskSseBus.subscribe` num Observable que emite cada evento live
   * como `MessageEvent`. O callback `setCleanup` recebe a funcao de
   * unsubscribe para ser invocada no teardown do stream externo.
   */
  private liveObservable(
    taskId: string,
    setCleanup: (off: () => void) => void,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const off = this.bus.subscribe(taskId, (event: TaskSseServerEvent) => {
        const messageEvent: MessageEvent = {
          id: event.id,
          type: event.type,
          data: event.data,
        };
        subscriber.next(messageEvent);
      });
      setCleanup(off);
      return () => off();
    });
  }
}
