/**
 * TaskOutboxService (ADR-003)
 *
 * Interface pública para produtores de eventos de domínio de tasks.
 * O único método operacional é `enqueue` — deve ser chamado dentro da
 * `$transaction` primária do caller para garantir atomicidade.
 *
 * Responsabilidades:
 *   1. INSERT na tabela `task_outbox_events` usando o `tx` passado.
 *   2. Após o commit da transaction, publicar um job BullMQ com o `eventId`
 *      para o worker drenar. A publicação BullMQ é um "hint" — se falhar,
 *      o evento ainda fica PENDING na tabela e é pego pelo poller de fallback
 *      (não implementado neste sprint; Sprint 2 adiciona `task-outbox-cleanup`
 *      + poll). O state na tabela é a fonte de verdade.
 *
 * Decisão sobre enqueue pós-commit:
 *   Prisma 7 não expõe `tx.$on('commit', ...)` em `$transaction` interativa.
 *   A alternativa adotada é: o caller recebe `enqueue` dentro da tx, o insert
 *   acontece; a publicação BullMQ retorna uma `Promise<void>` que o caller
 *   **não precisa** aguardar — ela é disparada após a Promise interna da tx
 *   resolver, via `queueMicrotask`. Em caso de falha do publish, logamos
 *   warning — o worker ainda consumirá via poll (garantia de at-least-once
 *   assumindo que um poller periódico existe no ambiente produtivo).
 *
 *   Durante o Sprint 1 esse poller não está implementado; o risco é que
 *   eventos inseridos mas nunca publicados no BullMQ fiquem "parados".
 *   Mitigação curta: o próprio `onModuleInit` do worker faz um "kick" inicial
 *   relendo PENDING na startup. Mitigação definitiva: cron poller em Sprint 2.
 */

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Prisma, TaskActivityType } from '@prisma/client';
import { Queue } from 'bullmq';
import { TaskOutboxRepository } from './task-outbox.repository';
import {
  QUEUE_TASK_OUTBOX,
  TASK_OUTBOX_EVENT_TYPES,
  TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS,
  type TaskOutboxEventType,
} from './task-outbox.constants';
import {
  TASK_SSE_BUS,
  type TaskSseBus,
} from '../tasks/sse/task-sse-bus.interface';
import { ActivityResponseDto } from '../task-activities/dtos/activity-response.dto';

export interface EnqueueInput {
  aggregateId: string;
  eventType: TaskOutboxEventType;
  payload: Record<string, unknown>;
  /** Correlação para logs distribuídos. Propagado do request context. */
  requestId?: string;
  /** Workspace do evento — facilita roteamento/observabilidade. */
  workspaceId?: string;
}

export interface OutboxJobData {
  eventId: string;
  /** Correlação para logs. */
  requestId?: string;
  workspaceId?: string;
}

const EVENT_TYPE_SET: ReadonlySet<string> = new Set<string>(
  TASK_OUTBOX_EVENT_TYPES,
);

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...[+${value.length - max}]`;
}

@Injectable()
export class TaskOutboxService {
  private readonly logger = new Logger(TaskOutboxService.name);

  /**
   * Fallback dev: quando `TASKS_OUTBOX_SYNC_DEV=true` o service projeta
   * `WorkItemActivity` + marca o outbox event como COMPLETED dentro da mesma
   * `$transaction` do caller. Uso: ambientes sem Redis/BullMQ (dev local).
   * Em producao e obrigatorio `false` — worker async e a fonte de verdade
   * (ADR-002). Publicacao SSE continua via bus local (EventEmitter2, nao
   * depende de Redis).
   */
  private readonly syncDev: boolean;

  constructor(
    private readonly repo: TaskOutboxRepository,
    private readonly config: ConfigService,
    /**
     * A fila é opcional para simplificar testes unitários e para tolerar
     * ambientes sem Redis (service continua inserindo no DB; worker fica
     * offline até infra voltar — ADR-003 consequência "dependência de Redis").
     */
    @Optional()
    @InjectQueue(QUEUE_TASK_OUTBOX)
    private readonly queue?: Queue<OutboxJobData>,
    @Optional()
    @Inject(TASK_SSE_BUS)
    private readonly sseBus?: TaskSseBus,
  ) {
    this.syncDev =
      this.config.get<boolean>('TASKS_OUTBOX_SYNC_DEV') === true ||
      this.config.get<string>('TASKS_OUTBOX_SYNC_DEV') === 'true';
    if (this.syncDev) {
      this.logger.warn(
        'task-outbox: TASKS_OUTBOX_SYNC_DEV=true -> projecao sincrona ativa (apenas dev).',
      );
    }
  }

  /**
   * Insere o evento na outbox dentro da `$transaction` do caller e
   * programa a publicação no BullMQ para depois do commit.
   *
   * Uso esperado:
   *
   * ```ts
   * await this.prisma.$transaction(async (tx) => {
   *   await tx.workItem.update({ where: { id }, data: { statusId } });
   *   await this.outbox.enqueue(tx, {
   *     aggregateId: id,
   *     eventType: 'STATUS_CHANGED',
   *     payload: { from: prev, to: next, actorId },
   *   });
   * });
   * ```
   *
   * Retorna o `eventId` para o caller poder correlacionar com logs/testes.
   */
  async enqueue(
    tx: Prisma.TransactionClient,
    input: EnqueueInput,
  ): Promise<string> {
    if (!EVENT_TYPE_SET.has(input.eventType)) {
      throw new Error(
        `TaskOutboxService: eventType inválido "${input.eventType}". ` +
          `Ver TASK_OUTBOX_EVENT_TYPES em task-outbox.constants.ts`,
      );
    }

    const row = await this.repo.insertPending(tx, {
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue,
    });

    // Log estruturado (sem payload completo — truncado).
    this.logger.log({
      message: 'task-outbox enqueue',
      requestId: input.requestId,
      workspaceId: input.workspaceId,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      eventId: row.id,
      payloadPreview: truncate(
        JSON.stringify(input.payload),
        TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS,
      ),
    });

    // Fallback dev: se TASKS_OUTBOX_SYNC_DEV=true, projeta WorkItemActivity e
    // marca outbox como COMPLETED dentro da mesma tx. Publicacao SSE via bus
    // local (EventEmitter2) apos a tx externa resolver.
    if (this.syncDev) {
      const actorId =
        typeof input.payload.actorId === 'string' ? input.payload.actorId : null;
      const activity = await this.repo.projectActivityInTx(tx, {
        outboxEventId: row.id,
        workItemId: input.aggregateId,
        type: input.eventType as TaskActivityType,
        actorId,
        payload: input.payload as Prisma.InputJsonValue,
      });
      if (this.sseBus) {
        queueMicrotask(() => {
          try {
            this.sseBus!.publish(input.aggregateId, {
              id: activity.createdAt.toISOString(),
              type: 'activity.created',
              data: ActivityResponseDto.fromEntity(
                activity,
              ) as unknown as Record<string, unknown>,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `task-outbox: falha ao publicar SSE sync-dev (eventId=${row.id}): ${msg}`,
            );
          }
        });
      }
      return row.id;
    }

    // Publicação pós-commit via microtask: como o caller ainda está dentro
    // da $transaction, agendamos o publish para a próxima fila de micro-
    // tasks — executa após o commit resolver a Promise externa da tx.
    // Em caso de falha no publish, o state na tabela permanece PENDING
    // e será drenado pelo poller (Sprint 2) ou pelo "kick" do worker.
    queueMicrotask(() => {
      void this.publishJob(row.id, input);
    });

    return row.id;
  }

  private async publishJob(
    eventId: string,
    input: EnqueueInput,
  ): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        `task-outbox: BullMQ queue não disponível; evento ${eventId} ficará PENDING até poller drenar.`,
      );
      return;
    }
    try {
      await this.queue.add(
        input.eventType,
        {
          eventId,
          requestId: input.requestId,
          workspaceId: input.workspaceId,
        },
        {
          // jobId determinístico para idempotência em caso de retry
          // de publicação — BullMQ deduplica.
          jobId: eventId,
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `task-outbox: falha ao publicar job no BullMQ (eventId=${eventId}): ${msg}. Row permanece PENDING na tabela.`,
      );
    }
  }
}
