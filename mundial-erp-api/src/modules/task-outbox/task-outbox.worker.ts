/**
 * TaskOutboxWorker (ADR-003)
 *
 * BullMQ processor que consome a fila `task-outbox`. Para cada job:
 *   1. Lê o row `task_outbox_events` pelo `eventId` (fonte de verdade).
 *   2. Transição PENDING|FAILED -> PROCESSING (compareAndSet via updateMany).
 *      Se outra worker já pegou, sai silenciosamente (concorrência segura).
 *   3. Idempotência: se status=COMPLETED, pula (replay seguro).
 *   4. Despacha para o handler registrado para `eventType`.
 *   5. Em sucesso -> markCompleted.
 *   6. Em falha:
 *      - attempts < MAX_ATTEMPTS -> markFailed (BullMQ reagenda com backoff).
 *      - attempts >= MAX_ATTEMPTS -> markDead + publicar em DLQ.
 *
 * Handlers:
 *   Registrados neste arquivo para Sprint 1 (subset mínimo). Sprint 2+
 *   pode migrar para injeção via `TaskOutboxModule.register(handlers)`.
 *
 * Observabilidade:
 *   - Logger estruturado com { requestId, workspaceId, aggregateId, eventType, durationMs }.
 *   - Métricas (`task_outbox_processing_seconds`, `task_outbox_processed_total`)
 *     ficam atrás de hooks `metrics.*` — a infra Prometheus/Datadog é TSK futura.
 *     Aqui apenas chamamos `this.recordMetric(...)` com no-op default.
 */

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  NotificationCategory,
  NotificationType,
  Prisma,
  TaskActivityType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxRepository } from './task-outbox.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityResponseDto } from '../task-activities/dtos/activity-response.dto';
import {
  TASK_SSE_BUS,
  type TaskSseBus,
  type TaskSseServerEvent,
  type TaskSseServerEventType,
} from '../tasks/sse/task-sse-bus.interface';
import {
  QUEUE_TASK_OUTBOX,
  QUEUE_TASK_OUTBOX_DLQ,
  TASK_OUTBOX_DEFAULT_CONCURRENCY,
  TASK_OUTBOX_EVENT_TYPES,
  TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS,
  TASK_OUTBOX_RETRY,
  type TaskOutboxEventType,
} from './task-outbox.constants';
import type { OutboxJobData } from './task-outbox.service';

/**
 * Shape minimo esperado da row retornada por `projectActivity`. Usamos um
 * type interno (em vez de `WorkItemActivity` do @prisma/client) para nao
 * quebrar typecheck enquanto Migration 3 ainda nao existir no client gerado.
 */
interface ProjectedActivityRow {
  id: string;
  workItemId: string;
  type: TaskActivityType;
  actorId: string | null;
  actor?: { id: string; name: string } | null;
  payload: Prisma.JsonValue;
  createdAt: Date;
}

/**
 * Subset de `TaskOutboxEventType` que deve projetar `WorkItemActivity` direta
 * via `projectActivity` (simple path: create 1 row). Eventos com logica extra
 * (STATUS_CHANGED, DEPENDENCY_UNBLOCKED, MERGED_INTO) tem handler dedicado
 * e nao aparecem aqui.
 */
const ACTIVITY_ONLY_EVENT_TYPES: ReadonlySet<TaskOutboxEventType> = new Set(
  [
    'CREATED',
    'RENAMED',
    'DESCRIPTION_CHANGED',
    'PRIORITY_CHANGED',
    'DUE_DATE_CHANGED',
    'START_DATE_CHANGED',
    'POINTS_CHANGED',
    'ARCHIVED',
    'UNARCHIVED',
    'CUSTOM_TYPE_CHANGED',
    'LINK_ADDED',
    'LINK_REMOVED',
    'DEPENDENCY_ADDED',
    'DEPENDENCY_REMOVED',
    'CHECKLIST_CREATED',
    'CHECKLIST_ITEM_RESOLVED',
    'ATTACHMENT_ADDED',
    'SUBTASK_ADDED',
    'SUBTASK_COMPLETED',
    'COMMENT_ADDED',
    'ASSIGNEE_ADDED',
    'ASSIGNEE_REMOVED',
    'WATCHER_ADDED',
    'WATCHER_REMOVED',
    'TAG_ADDED',
    'TAG_REMOVED',
  ] satisfies readonly TaskOutboxEventType[],
);

// Validacao de build-time: todo membro do set deve existir em TASK_OUTBOX_EVENT_TYPES.
// Se alguem remover um eventType da constante mas esquecer de atualizar o set acima,
// o startup do worker loga warning (melhor do que runtime surprise).
function validateActivityOnlySet(logger: Logger): void {
  const allowed = new Set<string>(TASK_OUTBOX_EVENT_TYPES);
  const invalid: string[] = [];
  for (const type of ACTIVITY_ONLY_EVENT_TYPES) {
    if (!allowed.has(type)) invalid.push(type);
  }
  if (invalid.length > 0) {
    logger.warn(
      `task-outbox: ACTIVITY_ONLY_EVENT_TYPES contem tipos invalidos: ${invalid.join(', ')}. Atualize task-outbox.constants.ts ou remova do set.`,
    );
  }
}

/**
 * Mapeia tipos do outbox (eventos de dominio) para tipos emitidos no SSE
 * ao cliente (contrato com `features/tasks/lib/sse-client.ts`). Hoje toda
 * projecao em activity vira `activity.created`. Futuro: podemos re-rotear
 * `COMMENT_ADDED` para `comment.created` e `ATTACHMENT_ADDED` para
 * `attachment.scan_completed` quando enriquecermos o payload no worker.
 */
function mapOutboxEventToSse(_eventType: TaskOutboxEventType): TaskSseServerEventType {
  // Padrao atual: tudo que vira activity e notificado como activity.created.
  // O cliente invalida `activities` + `detail` queries a partir dai.
  void _eventType;
  return 'activity.created';
}

interface PayloadShape {
  actorId?: string;
  workspaceId?: string;
  requestId?: string;
  from?: unknown;
  to?: unknown;
  userId?: string;
  watcherUserIds?: string[];
  assigneeUserIds?: string[];
  primaryAssigneeUserId?: string;
  tagId?: string;
  mergedIntoWorkItemId?: string;
  title?: string;
  [key: string]: unknown;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...[+${value.length - max}]`;
}

function jitterMs(base: number, fraction: number): number {
  const delta = base * fraction;
  return Math.floor(Math.random() * (2 * delta)) - Math.floor(delta);
}

@Processor(QUEUE_TASK_OUTBOX, {
  concurrency: Number(
    process.env.TASK_OUTBOX_CONCURRENCY ?? TASK_OUTBOX_DEFAULT_CONCURRENCY,
  ),
})
@Injectable()
export class TaskOutboxWorker extends WorkerHost {
  private readonly logger = new Logger(TaskOutboxWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: TaskOutboxRepository,
    private readonly notifications: NotificationsService,
    @Optional()
    @InjectQueue(QUEUE_TASK_OUTBOX_DLQ)
    private readonly dlq?: Queue,
    // Bus SSE — opcional para permitir testes unitarios sem TaskSseBusModule
    // e para nao quebrar inicializacao caso o modulo seja removido do grafo
    // em runtime de rollback. `?.publish()` abaixo garante no-op seguro.
    @Optional()
    @Inject(TASK_SSE_BUS)
    private readonly sseBus?: TaskSseBus,
  ) {
    super();
    validateActivityOnlySet(this.logger);
  }

  async process(job: Job<OutboxJobData>): Promise<void> {
    const { eventId, requestId, workspaceId } = job.data;
    const startedAt = Date.now();

    // 1. Transição PENDING|FAILED -> PROCESSING (compareAndSet).
    const acquired = await this.repo.markProcessing(eventId);
    if (!acquired) {
      // Outra instância já pegou OU evento já está COMPLETED/DEAD.
      this.logger.debug(
        `task-outbox: skip eventId=${eventId} (não foi possível transicionar para PROCESSING)`,
      );
      return;
    }

    const row = await this.repo.findById(eventId);
    if (!row) {
      this.logger.warn(`task-outbox: eventId=${eventId} não encontrado após markProcessing.`);
      return;
    }

    // 2. Idempotência — se já COMPLETED, não reaplicar. (Guarda contra reentrância.)
    if (await this.repo.isAlreadyCompleted(eventId)) {
      this.logger.debug(`task-outbox: eventId=${eventId} já COMPLETED, pulando.`);
      return;
    }

    const payload = (row.payload as unknown as PayloadShape | null) ?? {};
    const eventType = row.eventType as TaskOutboxEventType;
    const aggregateId = row.aggregateId;

    try {
      const ssePublished = await this.dispatch(eventType, aggregateId, payload);
      await this.repo.markCompleted(eventId);
      const durationMs = Date.now() - startedAt;
      this.logger.log({
        message: 'task-outbox processed',
        requestId: requestId ?? payload.requestId,
        workspaceId: workspaceId ?? payload.workspaceId,
        aggregateId,
        eventType,
        eventId,
        durationMs,
        status: 'COMPLETED',
        ssePublished,
      });
      this.recordMetric(eventType, 'COMPLETED', durationMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const attempts = row.attempts;
      const durationMs = Date.now() - startedAt;

      this.logger.error({
        message: 'task-outbox handler failed',
        requestId: requestId ?? payload.requestId,
        workspaceId: workspaceId ?? payload.workspaceId,
        aggregateId,
        eventType,
        eventId,
        attempts,
        durationMs,
        error: truncate(msg, TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS),
      });

      if (attempts >= TASK_OUTBOX_RETRY.MAX_ATTEMPTS) {
        await this.repo.markDead(eventId, msg);
        this.recordMetric(eventType, 'DEAD', durationMs);
        if (this.dlq) {
          await this.dlq.add('dead', { eventId, eventType, lastError: msg }).catch((dlqErr) => {
            this.logger.error(
              `task-outbox: falha ao publicar no DLQ (eventId=${eventId}): ${
                dlqErr instanceof Error ? dlqErr.message : String(dlqErr)
              }`,
            );
          });
        }
        // Não relançar — job BullMQ é considerado processado; o row está DEAD.
        return;
      }

      await this.repo.markFailed(eventId, msg);
      this.recordMetric(eventType, 'FAILED', durationMs);

      // Relança para o BullMQ reagendar com backoff exponencial + jitter.
      const base =
        TASK_OUTBOX_RETRY.BASE_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1));
      const delay = base + jitterMs(base, TASK_OUTBOX_RETRY.JITTER_FRACTION);
      await job.moveToDelayed(Date.now() + delay, job.token).catch(() => {
        // Se moveToDelayed falhar, relança o erro e deixa BullMQ aplicar sua política.
      });
      throw err;
    }
  }

  /**
   * Roteamento para handler por `eventType`. Retorna `true` se houve publish
   * bem-sucedido no bus SSE (para logar `ssePublished` no `process()`).
   *
   * Handlers extras serão migrados para injeção dinâmica em Sprint 2+
   * (TaskOutboxModule.register).
   */
  private async dispatch(
    eventType: TaskOutboxEventType,
    aggregateId: string,
    payload: PayloadShape,
  ): Promise<boolean> {
    switch (eventType) {
      case 'STATUS_CHANGED':
        return this.handleStatusChanged(aggregateId, payload);

      case 'DEPENDENCY_UNBLOCKED':
        return this.handleDependencyUnblocked(aggregateId, payload);

      case 'MERGED_INTO':
        return this.handleMergedInto(aggregateId, payload);

      default:
        if (ACTIVITY_ONLY_EVENT_TYPES.has(eventType)) {
          const row = await this.projectActivity(
            eventType,
            aggregateId,
            payload,
          );
          return this.publishToSse(eventType, aggregateId, row);
        }
        // Rede de seguranca: evento declarado em TASK_OUTBOX_EVENT_TYPES mas
        // sem handler mapeado — logar warn para visibilidade.
        this.logger.warn(
          `task-outbox: handler não implementado para eventType=${eventType} (aggregateId=${aggregateId}). Sprint pendente.`,
        );
        return false;
    }
  }

  /**
   * STATUS_CHANGED:
   *   1. Fecha a última linha de WorkItemStatusHistory (leftAt, durationSeconds).
   *   2. Cria nova linha aberta.
   *   3. Projeta activity (STATUS_CHANGED).
   *
   * NOTA: `WorkItemStatusHistory` e `WorkItemActivity` são criados na Migration
   * 3 (tasks_advanced). Até lá, esta função fica resiliente: se os delegates
   * não existirem, apenas registra log e retorna (stubs até desbloqueio).
   */
  private async handleStatusChanged(
    aggregateId: string,
    payload: PayloadShape,
  ): Promise<boolean> {
    const now = new Date();
    // Guard: se os modelos ainda não existem no client, degrade para no-op.
    // Usa `as unknown as` para não quebrar typecheck quando faltam delegates.
    const db = this.prisma as unknown as {
      workItemStatusHistory?: {
        findFirst: (args: unknown) => Promise<{ id: string; enteredAt: Date } | null>;
        update: (args: unknown) => Promise<unknown>;
        create: (args: unknown) => Promise<unknown>;
      };
      workItemActivity?: {
        create: (args: unknown) => Promise<ProjectedActivityRow>;
      };
    };

    if (!db.workItemStatusHistory || !db.workItemActivity) {
      this.logger.debug(
        `task-outbox: STATUS_CHANGED stub (models WorkItemStatusHistory/WorkItemActivity indisponíveis até Migration 3). aggregateId=${aggregateId}`,
      );
      return false;
    }

    // Captura a activity row DENTRO da transaction e publica no bus SSE
    // SO DEPOIS do commit — evita emitir evento live que depois sofreu
    // rollback. A consistencia eventual e aceitavel (<5ms extra).
    const activityRow = await this.prisma.$transaction(async (tx) => {
      const txAny = tx as unknown as typeof db;
      const open = await txAny.workItemStatusHistory!.findFirst({
        where: { workItemId: aggregateId, leftAt: null },
        orderBy: { enteredAt: 'desc' },
      });
      if (open) {
        const duration = Math.floor((now.getTime() - open.enteredAt.getTime()) / 1_000);
        await txAny.workItemStatusHistory!.update({
          where: { id: open.id },
          data: { leftAt: now, durationSeconds: duration },
        });
      }
      await txAny.workItemStatusHistory!.create({
        data: {
          workItemId: aggregateId,
          statusId: payload.to as string,
          enteredAt: now,
          enteredByUserId: payload.actorId,
        },
      });
      const row = await txAny.workItemActivity!.create({
        data: {
          workItemId: aggregateId,
          type: 'STATUS_CHANGED',
          actorId: payload.actorId,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    // Publish pos-commit: se a tx der rollback, activityRow seria undefined
    // e este ponto nao executaria (throw no await acima).
    return this.publishToSse('STATUS_CHANGED', aggregateId, activityRow);
  }

  /**
   * Insere 1 `WorkItemActivity` e retorna a row criada para publish no bus
   * SSE. Retorna `null` se o model ainda nao estiver disponivel (pre Migration 3)
   * — o caller degrada para log sem publicar.
   */
  private async projectActivity(
    eventType: TaskOutboxEventType,
    aggregateId: string,
    payload: PayloadShape,
  ): Promise<ProjectedActivityRow | null> {
    const db = this.prisma as unknown as {
      workItemActivity?: {
        create: (args: unknown) => Promise<ProjectedActivityRow>;
      };
    };
    if (!db.workItemActivity) {
      this.logger.debug(
        `task-outbox: projectActivity stub (WorkItemActivity indisponível até Migration 3). eventType=${eventType} aggregateId=${aggregateId}`,
      );
      return null;
    }
    const row = await db.workItemActivity.create({
      data: {
        workItemId: aggregateId,
        type: eventType,
        actorId: payload.actorId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      include: { actor: { select: { id: true, name: true } } },
    } as unknown as Parameters<typeof db.workItemActivity.create>[0]);
    return row;
  }

  /**
   * Publica a row projetada no bus SSE. Nao lanca — falha de bus nunca
   * deve impactar o handler do outbox (se sseBus ausente ou falha transiente,
   * apenas registra debug). Retorna `true` em sucesso.
   */
  private publishToSse(
    eventType: TaskOutboxEventType,
    aggregateId: string,
    row: ProjectedActivityRow | null,
  ): boolean {
    if (!row || !this.sseBus) return false;
    try {
      const sseEvent: TaskSseServerEvent = {
        id: row.createdAt.toISOString(),
        type: mapOutboxEventToSse(eventType),
        data: ActivityResponseDto.fromEntity(row) as unknown as Record<
          string,
          unknown
        >,
      };
      this.sseBus.publish(aggregateId, sseEvent);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(
        `task-outbox: SSE publish falhou (eventType=${eventType} aggregateId=${aggregateId}): ${msg}`,
      );
      return false;
    }
  }

  private async handleDependencyUnblocked(
    aggregateId: string,
    payload: PayloadShape,
  ): Promise<boolean> {
    // Primeiro projeta a activity (se model disponível) e publica no bus SSE.
    const row = await this.projectActivity(
      'DEPENDENCY_UNBLOCKED',
      aggregateId,
      payload,
    );
    const ssePublished = this.publishToSse(
      'DEPENDENCY_UNBLOCKED',
      aggregateId,
      row,
    );

    // Depois notifica watchers + primary assignee.
    const recipients = new Set<string>();
    if (payload.primaryAssigneeUserId) recipients.add(payload.primaryAssigneeUserId);
    for (const uid of payload.watcherUserIds ?? []) recipients.add(uid);

    for (const userId of recipients) {
      try {
        await this.notifications.create({
          userId,
          type: NotificationType.SYSTEM,
          category: NotificationCategory.PRIMARY,
          title: 'Task unblocked',
          description: `Task ${payload.title ?? aggregateId} no longer has blocking dependencies.`,
          entityId: aggregateId,
          entityUrl: `/tasks/${aggregateId}`,
        });
      } catch (err) {
        // Notification é best-effort dentro do handler; erro não mata o evento.
        this.logger.warn(
          `task-outbox: falha ao notificar userId=${userId} para DEPENDENCY_UNBLOCKED eventId aggregate=${aggregateId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return ssePublished;
  }

  private async handleMergedInto(
    aggregateId: string,
    payload: PayloadShape,
  ): Promise<boolean> {
    const row = await this.projectActivity('MERGED_INTO', aggregateId, payload);
    const ssePublished = this.publishToSse('MERGED_INTO', aggregateId, row);

    const recipients = new Set<string>();
    if (payload.primaryAssigneeUserId) recipients.add(payload.primaryAssigneeUserId);
    for (const uid of payload.watcherUserIds ?? []) recipients.add(uid);

    for (const userId of recipients) {
      try {
        await this.notifications.create({
          userId,
          type: NotificationType.SYSTEM,
          category: NotificationCategory.PRIMARY,
          title: 'Task merged',
          description: `Task ${aggregateId} was merged into ${
            payload.mergedIntoWorkItemId ?? 'another task'
          }.`,
          entityId: aggregateId,
          entityUrl: `/tasks/${payload.mergedIntoWorkItemId ?? aggregateId}`,
        });
      } catch (err) {
        this.logger.warn(
          `task-outbox: falha ao notificar userId=${userId} para MERGED_INTO aggregate=${aggregateId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return ssePublished;
  }

  /**
   * Hook de métricas — no-op por padrão. Integração Prometheus/Datadog
   * é TSK futura; por ora deixamos o ponto de extensão pronto.
   */
  private recordMetric(
    _eventType: string,
    _status: 'COMPLETED' | 'FAILED' | 'DEAD',
    _durationMs: number,
  ): void {
    // Intencional: stub. Substituir por histogram/counter Prometheus.
    void _eventType;
    void _status;
    void _durationMs;
  }
}
