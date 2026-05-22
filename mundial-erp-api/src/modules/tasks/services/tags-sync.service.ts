import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TaskOutboxService } from '../../task-outbox/task-outbox.service';
import { TaskEventsPublisher } from '../../automations/events/task-events.publisher';
import { PrismaService } from '../../../database/prisma.service';

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

interface PendingTagEvent {
  kind: 'added' | 'removed';
  tagId: string;
}

@Injectable()
export class TagsSyncService {
  private readonly logger = new Logger(TagsSyncService.name);

  constructor(
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
    private readonly prisma: PrismaService,
    @Optional()
    private readonly automationEvents?: TaskEventsPublisher,
  ) {}

  async syncTags(
    tx: Prisma.TransactionClient,
    params: SyncTagsParams,
  ): Promise<void> {
    const { taskId, add, rem, actorUserId, workspaceId, requestId } = params;
    const pending: PendingTagEvent[] = [];

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

      pending.push({ kind: 'added', tagId });

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

      pending.push({ kind: 'removed', tagId });

      this.logger.log(
        `tags.removed task=${taskId} tag=${tagId} actor=${actorUserId}`,
      );
    }

    if (pending.length > 0 && this.automationEvents) {
      this.scheduleAutomationEmit(taskId, actorUserId, workspaceId, pending);
    }
  }

  private scheduleAutomationEmit(
    taskId: string,
    actorUserId: string,
    workspaceId: string | undefined,
    pending: PendingTagEvent[],
  ): void {
    setImmediate(() => {
      void this.emitTagAutomationEvents(
        taskId,
        actorUserId,
        workspaceId,
        pending,
      );
    });
  }

  private async emitTagAutomationEvents(
    taskId: string,
    actorUserId: string,
    workspaceIdHint: string | undefined,
    pending: PendingTagEvent[],
  ): Promise<void> {
    if (!this.automationEvents) return;
    try {
      const ctx = await this.resolveTaskContext(taskId, workspaceIdHint);
      if (!ctx) return;
      for (const ev of pending) {
        const payload = {
          workspaceId: ctx.workspaceId,
          taskId,
          listId: ctx.listId,
          folderId: ctx.folderId,
          spaceId: ctx.spaceId,
          actorUserId,
          tagId: ev.tagId,
        };
        if (ev.kind === 'added') {
          this.automationEvents.emitTagAdded(payload);
        } else {
          this.automationEvents.emitTagRemoved(payload);
        }
      }
    } catch (err) {
      this.logger.warn(
        `tags.automation_emit_failed task=${taskId}: ${(err as Error).message}`,
      );
    }
  }

  private async resolveTaskContext(
    taskId: string,
    workspaceIdHint?: string,
  ): Promise<{
    workspaceId: string;
    listId: string;
    folderId: string | null;
    spaceId: string | null;
  } | null> {
    const row = await this.prisma.workItem.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        listId: true,
        list: {
          select: {
            folderId: true,
            spaceId: true,
            space: { select: { workspaceId: true } },
            folder: {
              select: {
                spaceId: true,
                space: { select: { workspaceId: true } },
              },
            },
          },
        },
      },
    });
    if (!row) return null;
    const spaceId = row.list.spaceId ?? row.list.folder?.spaceId ?? null;
    const workspaceId =
      row.list.space?.workspaceId ??
      row.list.folder?.space?.workspaceId ??
      workspaceIdHint ??
      null;
    if (!workspaceId) return null;
    return {
      workspaceId,
      listId: row.listId,
      folderId: row.list.folderId ?? null,
      spaceId,
    };
  }
}
