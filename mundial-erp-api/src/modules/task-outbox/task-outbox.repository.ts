/**
 * Repositório fino de leitura/atualização de `task_outbox_events`.
 *
 * Encapsula os 5 pontos de toque do worker:
 *   - buscar eventos PENDING (para processamento)
 *   - marcar como PROCESSING
 *   - marcar como COMPLETED
 *   - marcar como FAILED (reagendável)
 *   - marcar como DEAD (DLQ)
 *
 * O `enqueue` (insert PENDING) vive no service porque precisa receber
 * o `tx` do caller — o repo aqui serve à leitura e transições de estado.
 */

import { Injectable } from '@nestjs/common';
import {
  OutboxEventStatus,
  Prisma,
  TaskActivityType,
  TaskOutboxEvent,
  WorkItemActivity,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface PendingEventRow {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attempts: number;
  createdAt: Date;
}

@Injectable()
export class TaskOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert puro — caller decide a transaction. Por isso recebe o `tx`
   * como `Prisma.TransactionClient` e nunca usa `this.prisma` direto
   * para writes.
   */
  async insertPending(
    tx: Prisma.TransactionClient,
    input: {
      aggregateId: string;
      eventType: string;
      payload: Prisma.InputJsonValue;
    },
  ): Promise<TaskOutboxEvent> {
    return tx.taskOutboxEvent.create({
      data: {
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
        status: OutboxEventStatus.PENDING,
      },
    });
  }

  /**
   * Projecao sincrona de WorkItemActivity + marcacao do outbox event como
   * COMPLETED, tudo dentro da `$transaction` do caller.
   *
   * Uso: fallback dev quando Redis/BullMQ esta indisponivel. Em producao o
   * worker async via outbox continua sendo o caminho oficial (ADR-002).
   * Habilitado via env `TASKS_OUTBOX_SYNC_DEV=true` no service.
   */
  async projectActivityInTx(
    tx: Prisma.TransactionClient,
    input: {
      outboxEventId: string;
      workItemId: string;
      type: TaskActivityType;
      actorId: string | null;
      payload: Prisma.InputJsonValue;
    },
  ): Promise<WorkItemActivity & { actor: { id: string; name: string } | null }> {
    const activity = await tx.workItemActivity.create({
      data: {
        workItemId: input.workItemId,
        type: input.type,
        actorId: input.actorId,
        payload: input.payload,
      },
      include: { actor: { select: { id: true, name: true } } },
    });
    await tx.taskOutboxEvent.update({
      where: { id: input.outboxEventId },
      data: {
        status: OutboxEventStatus.COMPLETED,
        processedAt: new Date(),
      },
    });
    return activity;
  }

  async findPending(limit: number): Promise<PendingEventRow[]> {
    const rows = await this.prisma.taskOutboxEvent.findMany({
      where: { status: OutboxEventStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        aggregateId: true,
        eventType: true,
        payload: true,
        attempts: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async findById(id: string): Promise<TaskOutboxEvent | null> {
    return this.prisma.taskOutboxEvent.findUnique({ where: { id } });
  }

  /**
   * Atomic transition PENDING -> PROCESSING (ou FAILED -> PROCESSING em retry).
   * Incrementa attempts. Usa updateMany com filtro em status como primitiva de
   * `compareAndSet` — se outra worker já pegou o evento, retorna `count=0`.
   */
  async markProcessing(id: string): Promise<boolean> {
    const res = await this.prisma.taskOutboxEvent.updateMany({
      where: {
        id,
        status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] },
      },
      data: {
        status: OutboxEventStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });
    return res.count > 0;
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.taskOutboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.COMPLETED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.taskOutboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.FAILED,
        lastError: error.slice(0, 2_000),
      },
    });
  }

  async markDead(id: string, error: string): Promise<void> {
    await this.prisma.taskOutboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.DEAD,
        lastError: error.slice(0, 2_000),
        processedAt: new Date(),
      },
    });
  }

  /**
   * Helper para idempotência de handler: verifica se o evento já foi marcado
   * como COMPLETED. Consumidores podem usar isto antes de aplicar side-effect
   * adicional em cenários de replay.
   */
  async isAlreadyCompleted(id: string): Promise<boolean> {
    const row = await this.prisma.taskOutboxEvent.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status === OutboxEventStatus.COMPLETED;
  }

  /**
   * Deleta eventos COMPLETED cujo `processed_at` e mais antigo que N dias.
   * Interpolacao segura: `days` e Number (nao aceita string) — impossivel
   * SQL injection via este parametro.
   */
  async deleteCompletedOlderThanDays(days: number): Promise<number> {
    const safeDays = Math.floor(Number(days));
    if (!Number.isFinite(safeDays) || safeDays <= 0) {
      throw new Error('deleteCompletedOlderThanDays: days must be positive integer');
    }
    return this.prisma.$executeRawUnsafe(
      `DELETE FROM "task_outbox_events"
       WHERE "status" = 'COMPLETED'
         AND "processed_at" IS NOT NULL
         AND "processed_at" < NOW() - INTERVAL '${safeDays} days'`,
    );
  }

  /**
   * Deleta eventos DEAD cujo `created_at` e mais antigo que N dias.
   * Interpolacao segura: `days` e Number (nao aceita string).
   */
  async deleteDeadOlderThanDays(days: number): Promise<number> {
    const safeDays = Math.floor(Number(days));
    if (!Number.isFinite(safeDays) || safeDays <= 0) {
      throw new Error('deleteDeadOlderThanDays: days must be positive integer');
    }
    return this.prisma.$executeRawUnsafe(
      `DELETE FROM "task_outbox_events"
       WHERE "status" = 'DEAD'
         AND "created_at" < NOW() - INTERVAL '${safeDays} days'`,
    );
  }
}
