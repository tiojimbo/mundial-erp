import { Injectable } from '@nestjs/common';
import { Prisma, ProcessType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AreaCreateInput) {
    return this.prisma.area.create({ data });
  }

  async findById(id: string) {
    return this.prisma.area.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.area.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.area.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.area.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.AreaUpdateInput) {
    return this.prisma.area.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.area.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findBySlugWithDetails(slug: string) {
    return this.prisma.area.findFirst({
      where: { slug, deletedAt: null },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        processes: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
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

  async getProcessSummaries(areaId: string, showClosed = false) {
    const area = await this.prisma.area.findFirst({
      where: { id: areaId, deletedAt: null },
      select: { departmentId: true },
    });

    if (!area) return [];

    const processes = await this.prisma.process.findMany({
      where: { areaId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        processType: true,
        featureRoute: true,
        description: true,
        isPrivate: true,
        areaId: true,
        area: { select: { name: true } },
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
      processId: { in: listProcessIds },
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
              processId: true,
              title: true,
              statusId: true,
              priority: true,
              assigneeId: true,
              startDate: true,
              dueDate: true,
              sortOrder: true,
              status: {
                select: { id: true, name: true, color: true, category: true },
              },
            },
          }),
          this.prisma.workflowStatus.findMany({
            where: { departmentId: area.departmentId, deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, color: true, category: true },
          }),
        ])
      : [[], []];

    let processInstances: Array<{ processId: string; order: { status: string } }> = [];
    let pendingActivities: Array<{ processInstance: { processId: string } }> = [];
    let pendingHandoffs: Array<{ fromProcessInstance: { processId: string } }> = [];

    if (bpmProcessIds.length > 0) {
      [processInstances, pendingActivities, pendingHandoffs] =
        await Promise.all([
          this.prisma.processInstance.findMany({
            where: { processId: { in: bpmProcessIds }, deletedAt: null },
            select: {
              processId: true,
              order: { select: { status: true } },
            },
          }),
          this.prisma.activityInstance.findMany({
            where: {
              processInstance: {
                processId: { in: bpmProcessIds },
                deletedAt: null,
              },
              status: { in: ['PENDING', 'IN_PROGRESS'] },
              deletedAt: null,
            },
            select: {
              processInstance: { select: { processId: true } },
            },
          }),
          this.prisma.handoffInstance.findMany({
            where: {
              fromProcessInstance: {
                processId: { in: bpmProcessIds },
                deletedAt: null,
              },
              status: 'PENDING',
              deletedAt: null,
            },
            select: {
              fromProcessInstance: { select: { processId: true } },
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
        areaId: proc.areaId,
        areaName: proc.area?.name ?? null,
      };

      if (proc.processType === ProcessType.LIST) {
        const processItems = workItems.filter((wi) => wi.processId === proc.id);
        const groups = statuses.map((s) => {
          const items = processItems
            .filter((wi) => wi.statusId === s.id)
            .slice(0, 50);
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
        (pi) => pi.processId === proc.id,
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
          (a) => a.processInstance.processId === proc.id,
        ).length,
        pendingHandoffs: pendingHandoffs.filter(
          (h) => h.fromProcessInstance.processId === proc.id,
        ).length,
      };
    });
  }
}
