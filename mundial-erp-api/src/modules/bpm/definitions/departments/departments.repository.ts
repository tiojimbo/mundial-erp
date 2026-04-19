import { Injectable } from '@nestjs/common';
import { Prisma, ProcessType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.department.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { sectors: { where: { deletedAt: null } } },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.department.findFirst({
      where: { slug, workspaceId, deletedAt: null },
    });
  }

  async slugExists(workspaceId: string, slug: string): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: { slug, workspaceId },
    });
    return count > 0;
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.DepartmentWhereInput = { workspaceId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.department.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.DepartmentUpdateInput,
  ) {
    // Ownership já validada via findById(workspaceId, id) pelo service.
    return this.prisma.department.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSidebarTree(workspaceId: string) {
    const processSelect = {
      id: true,
      name: true,
      slug: true,
      processType: true,
      description: true,
      featureRoute: true,
      isPrivate: true,
      isProtected: true,
      sortOrder: true,
    } as const;

    return this.prisma.department.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        color: true,
        isPrivate: true,
        isDefault: true,
        isProtected: true,
        sortOrder: true,
        areas: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isPrivate: true,
            sortOrder: true,
            isDefault: true,
            processes: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              select: processSelect,
            },
          },
        },
        processes: {
          where: { deletedAt: null, areaId: null },
          orderBy: { sortOrder: 'asc' },
          select: processSelect,
        },
      },
    });
  }

  async findBySlugWithDetails(workspaceId: string, slug: string) {
    return this.prisma.department.findFirst({
      where: { slug, workspaceId, deletedAt: null },
      include: {
        areas: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isPrivate: true,
            _count: {
              select: { processes: { where: { deletedAt: null } } },
            },
          },
        },
        processes: {
          where: { deletedAt: null, areaId: null },
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

  /**
   * Busca resumos de todos os processos de um departamento em batch.
   * Evita N+1: uma query por tipo (LIST items, BPM counts) em vez de uma por processo.
   */
  async getProcessSummaries(
    workspaceId: string,
    departmentId: string,
    showClosed = false,
  ) {
    // 1. Buscar todos os processos do departamento (diretos + via areas)
    // Department já está escopado por workspace na chamada anterior (validação no service)
    const processes = await this.prisma.process.findMany({
      where: {
        deletedAt: null,
        OR: [
          { departmentId, department: { workspaceId }, areaId: null },
          {
            area: {
              departmentId,
              deletedAt: null,
              department: { workspaceId },
            },
          },
        ],
      },
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

    const listProcessIds = processes
      .filter((p) => p.processType === ProcessType.LIST)
      .map((p) => p.id);

    const bpmProcessIds = processes
      .filter((p) => p.processType === ProcessType.BPM)
      .map((p) => p.id);

    // 2. Batch: WorkItems agrupados por processo+status para processos LIST
    const workItemWhere: Prisma.WorkItemWhereInput = {
      processId: { in: listProcessIds },
      process: { department: { workspaceId } },
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
            take: 2500, // cap global para não estourar memória
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
                select: {
                  id: true,
                  name: true,
                  color: true,
                  category: true,
                },
              },
            },
          }),
          this.prisma.workflowStatus.findMany({
            where: {
              departmentId,
              department: { workspaceId },
              deletedAt: null,
            },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              color: true,
              category: true,
            },
          }),
        ])
      : [[], []];

    // 3. Batch: Contagens BPM para processos BPM
    let processInstances: Array<{
      processId: string;
      order: { status: string };
    }> = [];
    let pendingActivities: Array<{ processInstance: { processId: string } }> =
      [];
    let pendingHandoffs: Array<{ fromProcessInstance: { processId: string } }> =
      [];

    if (bpmProcessIds.length > 0) {
      [processInstances, pendingActivities, pendingHandoffs] =
        await Promise.all([
          this.prisma.processInstance.findMany({
            where: {
              processId: { in: bpmProcessIds },
              process: { department: { workspaceId } },
              deletedAt: null,
            },
            select: {
              processId: true,
              order: { select: { status: true } },
            },
          }),
          this.prisma.activityInstance.findMany({
            where: {
              processInstance: {
                processId: { in: bpmProcessIds },
                process: { department: { workspaceId } },
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
                process: { department: { workspaceId } },
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

    // 4. Montar resumo por processo
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

        return {
          ...base,
          totalItems: processItems.length,
          groups,
        };
      }

      // BPM
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
