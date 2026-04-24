/**
 * Repositorio de `WorkItemDependency`.
 *
 * IMPORTANTE: o model `WorkItemDependency` e criado pela Migration 3
 * (`tasks_advanced`). Ate a migration ser aplicada e `prisma generate` rodar,
 * o client Prisma nao expoe o delegate `workItemDependency` e os erros de
 * compilacao deste arquivo sao esperados — mesmo padrao de task-tags Sprint 2.
 *
 * Todas as queries filtram pelo workspace via transitivo
 * `fromTask.process.department.workspaceId = :ws` (PLANO-TASKS.md §8.1 —
 * cross-tenant retorna 404, nao 403).
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

export interface DependencyEdge {
  fromTaskId: string;
  toTaskId: string;
}

@Injectable()
export class TaskDependenciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cliente para ler/escrever dentro de uma transaction. Cai no `this.prisma`
   * quando `tx` nao e informado.
   */
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  /**
   * Confirma que o `taskId` pertence ao `workspaceId`. Usado para 404 cross-tenant.
   * Retorna `{ id, statusCategory }` para o service decidir sobre
   * `DEPENDENCY_UNBLOCKED` (emite se a source estiver em DONE/CLOSED).
   */
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
      select: {
        id: true,
        status: { select: { category: true } },
      },
    });
  }

  /** Lista arestas de saida (tasks que `taskId` bloqueia). */
  async findBlocking(workspaceId: string, taskId: string) {
    return this.prisma.workItemDependency.findMany({
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

  /** Lista arestas de entrada (tasks que bloqueiam `taskId`). */
  async findWaitingOn(workspaceId: string, taskId: string) {
    return this.prisma.workItemDependency.findMany({
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

  async findEdge(
    fromTaskId: string,
    toTaskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItemDependency.findUnique({
      where: { fromTaskId_toTaskId: { fromTaskId, toTaskId } },
      select: { fromTaskId: true, toTaskId: true },
    });
  }

  async createEdge(edge: DependencyEdge, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemDependency.create({
      data: {
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
      },
      select: { fromTaskId: true, toTaskId: true },
    });
  }

  async deleteEdge(edge: DependencyEdge, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemDependency.delete({
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
   * Move arestas das sources para o target durante um merge (§8.4), dedupli-
   * cando contra o que target ja possui e removendo self-refs. Encapsula
   * aqui a persistencia para manter `TasksService.merge` livre de Prisma.
   *
   * Budget: 2 findMany + ate 2 deleteMany + 2 updateMany (maximo 6 queries).
   */
  async moveEdgesForMerge(
    sourceIds: string[],
    targetId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.client(tx);
    // (a) Arestas ja existentes no target — evitam unique violation.
    const targetOut = await client.workItemDependency.findMany({
      where: { fromTaskId: targetId },
      select: { toTaskId: true },
    });
    const targetIn = await client.workItemDependency.findMany({
      where: { toTaskId: targetId },
      select: { fromTaskId: true },
    });
    const targetOutSet = new Set(targetOut.map((r) => r.toTaskId));
    const targetInSet = new Set(targetIn.map((r) => r.fromTaskId));

    // (b) Deleta arestas das sources que virariam duplicatas ou self-refs.
    await client.workItemDependency.deleteMany({
      where: {
        fromTaskId: { in: sourceIds },
        toTaskId: { in: [targetId, ...Array.from(targetOutSet)] },
      },
    });
    await client.workItemDependency.deleteMany({
      where: {
        toTaskId: { in: sourceIds },
        fromTaskId: { in: [targetId, ...Array.from(targetInSet)] },
      },
    });

    // (c) Move as restantes (from -> target e to -> target).
    await client.workItemDependency.updateMany({
      where: { fromTaskId: { in: sourceIds } },
      data: { fromTaskId: targetId },
    });
    await client.workItemDependency.updateMany({
      where: { toTaskId: { in: sourceIds } },
      data: { toTaskId: targetId },
    });
  }
}
