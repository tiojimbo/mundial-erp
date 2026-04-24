import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TaskOutboxService } from '../../task-outbox/task-outbox.service';

/**
 * WatchersSyncService (PLANO-TASKS.md §7.3 — Watchers)
 *
 * Contraparte do `TaskWatchersService` para quando o delta chega via
 * `PATCH /tasks/:id` (`watchers: { add, rem }`) em vez de POST/DELETE
 * individual. Ambos terminam no mesmo model `WorkItemWatcher` e emitem
 * os mesmos eventos de outbox.
 *
 * Diferencas em relacao ao `TaskWatchersService`:
 *   - Opera dentro de uma `tx` fornecida pelo caller (nao abre uma nova).
 *   - Nao valida workspace nem membership (isso fica com o caller — o
 *     TasksService ja resolveu a tarefa pelo workspaceId antes de chamar).
 *   - Idempotencia via catch de P2002 (add) / P2025 (rem).
 */

const OUTBOX_EVENT_WATCHER_ADDED = 'WATCHER_ADDED' as const;
const OUTBOX_EVENT_WATCHER_REMOVED = 'WATCHER_REMOVED' as const;

export interface SyncWatchersParams {
  taskId: string;
  add: string[];
  rem: string[];
  actorUserId: string;
  workspaceId?: string;
  requestId?: string;
}

@Injectable()
export class WatchersSyncService {
  private readonly logger = new Logger(WatchersSyncService.name);

  constructor(
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  async syncWatchers(
    tx: Prisma.TransactionClient,
    params: SyncWatchersParams,
  ): Promise<void> {
    const { taskId, add, rem, actorUserId, workspaceId, requestId } = params;

    const addDedup = Array.from(new Set(add));
    for (const userId of addDedup) {
      try {
        await tx.workItemWatcher.create({
          data: { workItemId: taskId, userId },
          select: { workItemId: true, userId: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_WATCHER_ADDED,
        payload: { taskId, userId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `watchers.added task=${taskId} user=${userId} actor=${actorUserId}`,
      );
    }

    const remDedup = Array.from(new Set(rem));
    for (const userId of remDedup) {
      try {
        await tx.workItemWatcher.delete({
          where: { workItemId_userId: { workItemId: taskId, userId } },
          select: { workItemId: true, userId: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          continue;
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_WATCHER_REMOVED,
        payload: { taskId, userId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `watchers.removed task=${taskId} user=${userId} actor=${actorUserId}`,
      );
    }
  }
}
