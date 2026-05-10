import { Injectable } from '@nestjs/common';
import { Prisma, ProcessType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Area NÃO possui workspaceId direto. Escopo via department.
   */
  async create(_workspaceId: string, data: Prisma.FolderCreateInput) {
    return this.prisma.folder.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.folder.findFirst({
      where: { id, deletedAt: null, space: { workspaceId } },
      include: {
        space: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.folder.findFirst({
      where: { slug, deletedAt: null, space: { workspaceId } },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.FolderWhereInput = {
      deletedAt: null,
      space: { workspaceId },
    };
    const [items, total] = await Promise.all([
      this.prisma.folder.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
        include: {
          space: { select: { id: true, name: true } },
        },
      }),
      this.prisma.folder.count({ where }),
    ]);
    return { items, total };
  }

  async update(_workspaceId: string, id: string, data: Prisma.FolderUpdateInput) {
    return this.prisma.folder.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.folder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findBySlugWithDetails(workspaceId: string, slug: string) {
    return this.prisma.folder.findFirst({
      where: { slug, deletedAt: null, space: { workspaceId } },
      include: {
        space: { select: { id: true, name: true, slug: true } },
        lists: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            processType: true,
            featureRoute: true,
            description: true,
            isPrivate: true,
          },
        },
      },
    });
  }

  async getProcessSummaries(
    workspaceId: string,
    folderId: string,
    showClosed = false,
  ) {
    const area = await this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, space: { workspaceId } },
      select: { spaceId: true },
    });

    if (!area) return [];

    const processes = await this.prisma.list.findMany({
      where: { folderId, deletedAt: null, folder: { space: { workspaceId } } },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        processType: true,
        featureRoute: true,
        description: true,
        isPrivate: true,
        folderId: true,
        folder: { select: { name: true } },
      },
    });

    if (processes.length === 0) return [];

    const listProcessIds = processes
      .filter((p) => p.processType === ProcessType.LIST)
      .map((p) => p.id);

    const bpmProcessIds = processes
      .filter((p) => p.processType === ProcessType.BPM)
      .map((p) => p.id);

    const workItemWhere: Prisma.WorkItemWhereInput = {
      listId: { in: listProcessIds },
      list: { folder: { space: { workspaceId } } },
      deletedAt: null,
      parentId: null,
    };
    if (!showClosed) {
      workItemWhere.closedAt = null;
    }

    const [workItems, statuses] = listProcessIds.length
      ? await Promise.all([
          this.prisma.workItem.findMany({
            where: workItemWhere,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 2500,
            select: {
              id: true,
              listId: true,
              title: true,
              statusId: true,
              priority: true,
              // ADR-001: campo Prisma renomeado. Consumidores podem re-mapear
              // para `assigneeId` na fronteira da API se necessario.
              primaryAssigneeCache: true,
              startDate: true,
              dueDate: true,
              sortOrder: true,
              status: {
                select: { id: true, name: true, color: true, category: true },
              },
            },
          }),
          this.prisma.workflowStatus.findMany({
            where: {
              spaceId: area.spaceId,
              space: { workspaceId },
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
            select: { id: true, name: true, color: true, category: true },
          }),
        ])
      : [[], []];

    let processInstances: Array<{
      listId: string;
      order: { status: string };
    }> = [];
    let pendingActivities: Array<{ processInstance: { listId: string } }> =
      [];
    let pendingHandoffs: Array<{ fromProcessInstance: { listId: string } }> =
      [];

    if (bpmProcessIds.length > 0) {
      [processInstances, pendingActivities, pendingHandoffs] =
        await Promise.all([
          this.prisma.processInstance.findMany({
            where: {
              listId: { in: bpmProcessIds },
              list: { folder: { space: { workspaceId } } },
              deletedAt: null,
            },
            select: {
              listId: true,
              order: { select: { status: true } },
            },
          }),
          this.prisma.activityInstance.findMany({
            where: {
              processInstance: {
                listId: { in: bpmProcessIds },
                list: { folder: { space: { workspaceId } } },
                deletedAt: null,
              },
              status: { in: ['PENDING', 'IN_PROGRESS'] },
              deletedAt: null,
            },
            select: {
              processInstance: { select: { listId: true } },
            },
          }),
          this.prisma.handoffInstance.findMany({
            where: {
              fromProcessInstance: {
                listId: { in: bpmProcessIds },
                list: { folder: { space: { workspaceId } } },
                deletedAt: null,
              },
              status: 'PENDING',
              deletedAt: null,
            },
            select: {
              fromProcessInstance: { select: { listId: true } },
            },
          }),
        ]);
    }

    return processes.map((proc) => {
      const base = {
        id: proc.id,
        name: proc.name,
        slug: proc.slug,
        processType: proc.processType,
        featureRoute: proc.featureRoute,
        description: proc.description,
        isPrivate: proc.isPrivate,
        folderId: proc.folderId,
        areaName: proc.folder?.name ?? null,
      };

      if (proc.processType === ProcessType.LIST) {
        const processItems = workItems.filter((wi) => wi.listId === proc.id);
        const groups = statuses.map((s) => {
          const items = processItems
            .filter((wi) => wi.statusId === s.id)
            .slice(0, 50)
            .map((wi) => {
              // ADR-001: remapeia campo Prisma renomeado para o contrato
              // externo historico `assigneeId`, preservando compat do front.
              const { primaryAssigneeCache, ...rest } = wi;
              return { ...rest, assigneeId: primaryAssigneeCache };
            });
          return {
            statusId: s.id,
            statusName: s.name,
            statusColor: s.color,
            statusCategory: s.category,
            count: processItems.filter((wi) => wi.statusId === s.id).length,
            items,
          };
        });

        return { ...base, totalItems: processItems.length, groups };
      }

      const procInstances = processInstances.filter(
        (pi) => pi.listId === proc.id,
      );
      const ordersByStatus: Record<string, number> = {};
      for (const pi of procInstances) {
        const st = pi.order.status;
        ordersByStatus[st] = (ordersByStatus[st] ?? 0) + 1;
      }

      return {
        ...base,
        totalOrders: procInstances.length,
        ordersByStatus,
        pendingActivities: pendingActivities.filter(
          (a) => a.processInstance.listId === proc.id,
        ).length,
        pendingHandoffs: pendingHandoffs.filter(
          (h) => h.fromProcessInstance.listId === proc.id,
        ).length,
      };
    });
  }
}
