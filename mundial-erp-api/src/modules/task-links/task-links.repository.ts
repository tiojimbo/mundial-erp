import { Injectable } from '@nestjs/common';
import { LinkType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const WORK_ITEM_SUMMARY_SELECT = {
  id: true,
  title: true,
  status: { select: { id: true, name: true, color: true, type: true } },
  customType: { select: { id: true, name: true, icon: true } },
  list: { select: { id: true, name: true } },
} as const;

export interface LinkEdge {
  fromTaskId: string;
  toTaskId: string;
  type: LinkType;
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
        list: { space: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findOutgoing(workspaceId: string, taskId: string) {
    return this.prisma.workItemLink.findMany({
      where: {
        fromTaskId: taskId,
        fromTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
        toTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
      },
      select: {
        id: true,
        type: true,
        toTask: { select: WORK_ITEM_SUMMARY_SELECT },
      },
    });
  }

  async findIncoming(workspaceId: string, taskId: string) {
    return this.prisma.workItemLink.findMany({
      where: {
        toTaskId: taskId,
        fromTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
        toTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
      },
      select: {
        id: true,
        type: true,
        fromTask: { select: WORK_ITEM_SUMMARY_SELECT },
      },
    });
  }

  /**
   * Idempotencia: o `WorkItemLink` tem unique em `[fromTaskId, toTaskId, type]`.
   * Pra RELATES_TO (simetrico) checamos as duas direcoes; pra DUPLICATES e
   * IS_DUPLICATED_BY a direcao importa, entao olhamos so o par exato.
   */
  async findEdgePair(
    fromTaskId: string,
    toTaskId: string,
    type: LinkType,
    tx?: Prisma.TransactionClient,
  ) {
    if (type === LinkType.RELATES_TO) {
      return this.client(tx).workItemLink.findFirst({
        where: {
          type,
          OR: [
            { fromTaskId, toTaskId },
            { fromTaskId: toTaskId, toTaskId: fromTaskId },
          ],
        },
        select: { id: true, fromTaskId: true, toTaskId: true, type: true },
      });
    }
    return this.client(tx).workItemLink.findFirst({
      where: { fromTaskId, toTaskId, type },
      select: { id: true, fromTaskId: true, toTaskId: true, type: true },
    });
  }

  async findEdgeById(
    workspaceId: string,
    linkId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItemLink.findFirst({
      where: {
        id: linkId,
        fromTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
        toTask: {
          deletedAt: null,
          list: { space: { workspaceId } },
        },
      },
      select: { id: true, fromTaskId: true, toTaskId: true, type: true },
    });
  }

  async createEdge(edge: LinkEdge, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemLink.create({
      data: {
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
        type: edge.type,
      },
      select: { id: true, fromTaskId: true, toTaskId: true, type: true },
    });
  }

  async deleteEdgeById(linkId: string, tx?: Prisma.TransactionClient) {
    await this.client(tx).workItemLink.deleteMany({ where: { id: linkId } });
  }

  /**
   * Move links das sources para o target durante merge (§8.4), deduplicando
   * e removendo self-refs.
   */
  async moveEdgesForMerge(
    sourceIds: string[],
    targetId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.client(tx);
    const targetOut = await client.workItemLink.findMany({
      where: { fromTaskId: targetId },
      select: { toTaskId: true, type: true },
    });
    const targetIn = await client.workItemLink.findMany({
      where: { toTaskId: targetId },
      select: { fromTaskId: true, type: true },
    });
    const targetOutSet = new Set(
      targetOut.map((r) => `${r.toTaskId}:${r.type}`),
    );
    const targetInSet = new Set(
      targetIn.map((r) => `${r.fromTaskId}:${r.type}`),
    );

    const sourceOut = await client.workItemLink.findMany({
      where: { fromTaskId: { in: sourceIds } },
      select: { id: true, toTaskId: true, type: true },
    });
    const sourceIn = await client.workItemLink.findMany({
      where: { toTaskId: { in: sourceIds } },
      select: { id: true, fromTaskId: true, type: true },
    });

    const outDuplicateIds = sourceOut
      .filter(
        (r) =>
          r.toTaskId === targetId ||
          targetOutSet.has(`${r.toTaskId}:${r.type}`),
      )
      .map((r) => r.id);
    const inDuplicateIds = sourceIn
      .filter(
        (r) =>
          r.fromTaskId === targetId ||
          targetInSet.has(`${r.fromTaskId}:${r.type}`),
      )
      .map((r) => r.id);

    if (outDuplicateIds.length || inDuplicateIds.length) {
      await client.workItemLink.deleteMany({
        where: { id: { in: [...outDuplicateIds, ...inDuplicateIds] } },
      });
    }

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
