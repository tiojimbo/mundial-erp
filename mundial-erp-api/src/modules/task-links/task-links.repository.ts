/**
 * Repositorio de `WorkItemLink`.
 *
 * IMPORTANTE: o model `WorkItemLink` vem da Migration 3 (`tasks_advanced`).
 * Ate que a migration seja aplicada e `prisma generate` rode, os delegates
 * `workItemLink` nao existem em runtime e os erros de compilacao sao
 * esperados (mesmo padrao de task-dependencies).
 *
 * A listagem usa UNION via duas queries: arestas `from=:taskId` e
 * `to=:taskId`. Simetria assim fica em camada de servico ao inves de depender
 * de uma view materializada (PLANO-TASKS.md §7.3).
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const WORK_ITEM_SUMMARY_SELECT = {
  id: true,
  title: true,
  statusId: true,
  priority: true,
  dueDate: true,
  primaryAssigneeCache: true,
  archived: true,
  status: { select: { category: true } },
} as const;

export interface LinkEdge {
  fromTaskId: string;
  toTaskId: string;
}

@Injectable()
export class TaskLinksRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findTaskInWorkspace(
    workspaceId: string,
    taskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  /** Arestas saindo: `fromTaskId = taskId`. */
  async findOutgoing(workspaceId: string, taskId: string) {
    return this.prisma.workItemLink.findMany({
      where: {
        fromTaskId: taskId,
        fromTask: {
          deletedAt: null,
          process: { department: { workspaceId } },
        },
        toTask: {
          deletedAt: null,
          process: { department: { workspaceId } },
        },
      },
      select: {
        toTask: { select: WORK_ITEM_SUMMARY_SELECT },
      },
    });
  }

  /** Arestas chegando: `toTaskId = taskId`. */
  async findIncoming(workspaceId: string, taskId: string) {
    return this.prisma.workItemLink.findMany({
      where: {
        toTaskId: taskId,
        fromTask: {
          deletedAt: null,
          process: { department: { workspaceId } },
        },
        toTask: {
          deletedAt: null,
          process: { department: { workspaceId } },
        },
      },
      select: {
        fromTask: { select: WORK_ITEM_SUMMARY_SELECT },
      },
    });
  }

  /**
   * Procura a aresta em qualquer direcao — links sao simetricos, entao criar
   * `A<->B` via rota `POST /tasks/A/links/B` ou `POST /tasks/B/links/A` deve
   * ser idempotente.
   */
  async findEdgeAnyDirection(
    taskA: string,
    taskB: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItemLink.findFirst({
      where: {
        OR: [
          { fromTaskId: taskA, toTaskId: taskB },
          { fromTaskId: taskB, toTaskId: taskA },
        ],
      },
      select: { fromTaskId: true, toTaskId: true },
    });
  }

  async createEdge(edge: LinkEdge, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemLink.create({
      data: {
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
      },
      select: { fromTaskId: true, toTaskId: true },
    });
  }

  async deleteEdge(edge: LinkEdge, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemLink.delete({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
        },
      },
      select: { fromTaskId: true, toTaskId: true },
    });
  }

  /**
   * Move links das sources para o target durante merge (§8.4), deduplicando
   * e removendo self-refs. Mesmo contrato de `moveEdgesForMerge` em
   * TaskDependenciesRepository — `TasksService.merge` chama os dois.
   */
  async moveEdgesForMerge(
    sourceIds: string[],
    targetId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.client(tx);
    const targetOut = await client.workItemLink.findMany({
      where: { fromTaskId: targetId },
      select: { toTaskId: true },
    });
    const targetIn = await client.workItemLink.findMany({
      where: { toTaskId: targetId },
      select: { fromTaskId: true },
    });
    const targetOutSet = new Set(targetOut.map((r) => r.toTaskId));
    const targetInSet = new Set(targetIn.map((r) => r.fromTaskId));

    await client.workItemLink.deleteMany({
      where: {
        fromTaskId: { in: sourceIds },
        toTaskId: { in: [targetId, ...Array.from(targetOutSet)] },
      },
    });
    await client.workItemLink.deleteMany({
      where: {
        toTaskId: { in: sourceIds },
        fromTaskId: { in: [targetId, ...Array.from(targetInSet)] },
      },
    });

    await client.workItemLink.updateMany({
      where: { fromTaskId: { in: sourceIds } },
      data: { fromTaskId: targetId },
    });
    await client.workItemLink.updateMany({
      where: { toTaskId: { in: sourceIds } },
      data: { toTaskId: targetId },
    });
  }
}
