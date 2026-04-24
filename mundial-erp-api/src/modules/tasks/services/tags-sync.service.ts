import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TaskOutboxService } from '../../task-outbox/task-outbox.service';

/**
 * TagsSyncService (PLANO-TASKS.md §7.3 — Tags)
 *
 * Aplica o delta `{ add, rem }` de `WorkItemTagLink` em uma transacao
 * fornecida pelo caller. Contraparte do `TaskTagsService.attach/detach`
 * para quando o delta chega via PATCH /tasks/:id (`tagIds: { add, rem }`).
 *
 * Nao cria/deleta tags — apenas gerencia a associacao `(workItemId, tagId)`.
 * Caller deve garantir que ambos pertencem ao mesmo workspace antes
 * (tipicamente `TasksService` ja validou `task.process.department.workspaceId`
 * e filtrou `tagIds` contra `workItemTag.workspaceId`).
 */

const OUTBOX_EVENT_TAG_ADDED = 'TAG_ADDED' as const;
const OUTBOX_EVENT_TAG_REMOVED = 'TAG_REMOVED' as const;

export interface SyncTagsParams {
  taskId: string;
  add: string[];
  rem: string[];
  actorUserId: string;
  workspaceId?: string;
  requestId?: string;
}

@Injectable()
export class TagsSyncService {
  private readonly logger = new Logger(TagsSyncService.name);

  constructor(
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  async syncTags(
    tx: Prisma.TransactionClient,
    params: SyncTagsParams,
  ): Promise<void> {
    const { taskId, add, rem, actorUserId, workspaceId, requestId } = params;

    const addDedup = Array.from(new Set(add));
    for (const tagId of addDedup) {
      try {
        await tx.workItemTagLink.create({
          data: { workItemId: taskId, tagId },
          select: { workItemId: true, tagId: true },
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
        eventType: OUTBOX_EVENT_TAG_ADDED,
        payload: { taskId, tagId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `tags.added task=${taskId} tag=${tagId} actor=${actorUserId}`,
      );
    }

    const remDedup = Array.from(new Set(rem));
    for (const tagId of remDedup) {
      try {
        await tx.workItemTagLink.delete({
          where: { workItemId_tagId: { workItemId: taskId, tagId } },
          select: { workItemId: true, tagId: true },
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
        eventType: OUTBOX_EVENT_TAG_REMOVED,
        payload: { taskId, tagId, actorId: actorUserId },
        workspaceId,
        requestId,
      });

      this.logger.log(
        `tags.removed task=${taskId} tag=${tagId} actor=${actorUserId}`,
      );
    }
  }
}
