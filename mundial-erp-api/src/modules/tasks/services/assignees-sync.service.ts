import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TaskOutboxService } from '../../task-outbox/task-outbox.service';

/**
 * AssigneesSyncService (PLANO-TASKS.md §8.6 — Multi-assignees, ADR-001)
 *
 * Aplica o delta `{ add, rem }` de `WorkItemAssignee` em uma transacao
 * fornecida pelo caller (tipicamente `TasksService.update` dentro do
 * PATCH /tasks/:id). Emite 1 evento de outbox por linha alterada, para
 * que o worker de outbox gere activities + notifications (§5.1, §8.12).
 *
 * Invariantes:
 *   - **Primary assignee NAO e escrito aqui.** A Prisma extension
 *     (ADR-001) recalcula `WorkItem.primaryAssigneeCache` automaticamente
 *     apos cada create/delete em `work_item_assignees`. Nao atualizamos
 *     `isPrimary` manualmente — new rows entram com `isPrimary: false`.
 *   - **Idempotente.** `create` com par `(workItemId, userId)` ja existente
 *     retorna P2002 → ignoramos. `delete` de linha inexistente retorna
 *     P2025 → ignoramos. Essa robustez permite que callers computem o
 *     delta ingenuamente sem consultar o estado atual.
 *   - **Transacional.** O caller passa o `tx`; inserts/deletes/outbox
 *     compartilham a mesma transacao para atomicidade (all-or-nothing).
 */

const OUTBOX_EVENT_ASSIGNEE_ADDED = 'ASSIGNEE_ADDED' as const;
const OUTBOX_EVENT_ASSIGNEE_REMOVED = 'ASSIGNEE_REMOVED' as const;

export interface SyncAssigneesParams {
  taskId: string;
  /** IDs de usuarios para adicionar como assignees. Duplicatas sao ignoradas. */
  add: string[];
  /** IDs de usuarios para remover dos assignees. */
  rem: string[];
  /** Autor da mudanca (usado como `assignedBy` e no payload do evento). */
  actorUserId: string;
  /** Opcional, propagado para logs do outbox. */
  workspaceId?: string;
  /** Opcional, propagado para logs do outbox. */
  requestId?: string;
}

@Injectable()
export class AssigneesSyncService {
  private readonly logger = new Logger(AssigneesSyncService.name);

  constructor(
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  async syncAssignees(
    tx: Prisma.TransactionClient,
    params: SyncAssigneesParams,
  ): Promise<void> {
    const { taskId, add, rem, actorUserId, workspaceId, requestId } = params;

    // --- ADDs ---------------------------------------------------------------
    // Deduplica input e aplica cada insercao individualmente para poder
    // ignorar P2002 por linha sem abortar as demais.
    const addDedup = Array.from(new Set(add));
    for (const userId of addDedup) {
      try {
        await tx.workItemAssignee.create({
          data: {
            workItemId: taskId,
            userId,
            isPrimary: false,
            assignedAt: new Date(),
            assignedBy: actorUserId,
          },
          select: { workItemId: true, userId: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          // Ja era assignee — idempotente; nao emite evento.
          continue;
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_ASSIGNEE_ADDED,
        payload: { taskId, userId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `assignees.added task=${taskId} user=${userId} actor=${actorUserId}`,
      );
    }

    // --- REMs ---------------------------------------------------------------
    const remDedup = Array.from(new Set(rem));
    for (const userId of remDedup) {
      try {
        await tx.workItemAssignee.delete({
          where: { workItemId_userId: { workItemId: taskId, userId } },
          select: { workItemId: true, userId: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          // Nao era assignee — idempotente; nao emite evento.
          continue;
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_ASSIGNEE_REMOVED,
        payload: { taskId, userId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `assignees.removed task=${taskId} user=${userId} actor=${actorUserId}`,
      );
    }
  }
}
