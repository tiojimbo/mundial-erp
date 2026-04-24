/**
 * Repositorio READ-ONLY de WorkItemActivity (TSK-409, ADR-002).
 *
 * NUNCA escrever direto aqui — somente o worker do task-outbox popula rows,
 * garantindo o contrato "activity feed como projecao assincrona".
 * A regra e enforcada no service (sem metodos de write) + lint rule
 * `no-direct-activity-write` (ADR-002).
 */
import { Injectable } from '@nestjs/common';
import { Prisma, TaskActivityType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const ACTIVITY_SELECT = {
  id: true,
  workItemId: true,
  type: true,
  actorId: true,
  payload: true,
  createdAt: true,
  actor: { select: { id: true, name: true } },
} as const;

export type ActivityRow = Prisma.WorkItemActivityGetPayload<{
  select: typeof ACTIVITY_SELECT;
}>;

const MAX_PAGE_TAKE = 100;
const MAX_REPLAY_TAKE = 200;

export type ActivityProjectionFilter = 'ACTIVITY' | 'COMMENT' | 'ALL';

export interface FindActivitiesParams {
  skip?: number;
  take?: number;
  type?: ActivityProjectionFilter;
  actions?: TaskActivityType[];
  actorId?: string;
  cursor?: Date;
}

@Injectable()
export class TaskActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTaskInWorkspace(
    workspaceId: string,
    taskId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findByTask(
    workspaceId: string,
    taskId: string,
    params: FindActivitiesParams,
  ): Promise<{ items: ActivityRow[]; total: number }> {
    const { skip = 0, take = 50, type = 'ALL', actions, actorId, cursor } = params;
    const safeTake = Math.min(take, MAX_PAGE_TAKE);

    const where: Prisma.WorkItemActivityWhereInput = {
      workItemId: taskId,
      workItem: { process: { department: { workspaceId } } },
    };

    if (type === 'COMMENT') {
      where.type = 'COMMENT_ADDED';
    } else if (type === 'ACTIVITY') {
      where.type = { not: 'COMMENT_ADDED' };
    }

    if (actions && actions.length > 0) {
      // Filtro explicito por acoes sobrescreve o projection filter acima
      where.type = { in: actions };
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (cursor) {
      where.createdAt = { lt: cursor };
    }

    const [items, total] = await Promise.all([
      this.prisma.workItemActivity.findMany({
        where,
        skip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        select: ACTIVITY_SELECT,
      }),
      this.prisma.workItemActivity.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Bulk lookup de `WorkflowStatus` pelos ids — usado pelo service para
   * enriquecer payloads de STATUS_CHANGED/CREATED com `{ name, color, category }`.
   */
  async findStatusesByIds(
    ids: string[],
  ): Promise<
    { id: string; name: string; color: string; category: string }[]
  > {
    if (ids.length === 0) return [];
    return this.prisma.workflowStatus.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, color: true, category: true },
    });
  }

  /**
   * Replay cronologico para SSE (Last-Event-ID).
   * Retorna eventos com `createdAt > since` em ordem ASC.
   */
  async findAfter(
    taskId: string,
    since: Date,
    limit = MAX_REPLAY_TAKE,
  ): Promise<ActivityRow[]> {
    const safeTake = Math.min(limit, MAX_REPLAY_TAKE);
    return this.prisma.workItemActivity.findMany({
      where: {
        workItemId: taskId,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'asc' },
      take: safeTake,
      select: ACTIVITY_SELECT,
    });
  }
}
