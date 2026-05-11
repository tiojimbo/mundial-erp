import { Injectable } from '@nestjs/common';
import { Prisma, ProcessType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class SpacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.SpaceCreateInput) {
    return this.prisma.space.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.space.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { sectors: { where: { deletedAt: null } } },
    });
  }

  async findByIdWithDefaults(workspaceId: string, id: string) {
    return this.prisma.space.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        folders: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            lists: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
            },
          },
        },
        statuses: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.space.findFirst({
      where: { slug, workspaceId, deletedAt: null },
    });
  }

  async slugExists(workspaceId: string, slug: string): Promise<boolean> {
    const count = await this.prisma.space.count({
      where: { slug, workspaceId },
    });
    return count > 0;
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.SpaceWhereInput = { workspaceId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.space.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
      }),
      this.prisma.space.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.SpaceUpdateInput,
  ) {
    // Ownership já validada via findById(workspaceId, id) pelo service.
    return this.prisma.space.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.space.update({
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
      position: true,
    } as const;

    return this.prisma.space.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { position: 'asc' },
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
        position: true,
        folders: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isPrivate: true,
            position: true,
            isDefault: true,
            lists: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
              select: processSelect,
            },
          },
        },
        lists: {
          where: { deletedAt: null, folderId: null },
          orderBy: { position: 'asc' },
          select: processSelect,
        },
      },
    });
  }

  async findBySlugWithDetails(workspaceId: string, slug: string) {
    return this.prisma.space.findFirst({
      where: { slug, workspaceId, deletedAt: null },
      include: {
        folders: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isPrivate: true,
            _count: {
              select: { lists: { where: { deletedAt: null } } },
            },
          },
        },
        lists: {
          where: { deletedAt: null, folderId: null },
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

  /**
   * Busca resumos de todos os processos de um departamento em batch.
   * Evita N+1: uma query por tipo (LIST items, BPM counts) em vez de uma por processo.
   */
  async getProcessSummaries(
    workspaceId: string,
    spaceId: string,
    showClosed = false,
  ) {
    // 1. Buscar todos os processos do departamento (diretos + via areas)
    // Department já está escopado por workspace na chamada anterior (validação no service)
    const processes = await this.prisma.list.findMany({
      where: {
        deletedAt: null,
        OR: [
          { spaceId, space: { workspaceId }, folderId: null },
          {
            folder: {
              spaceId,
              deletedAt: null,
              space: { workspaceId },
            },
          },
        ],
      },
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

    const listProcessIds = processes
      .filter((p) => p.processType === ProcessType.LIST)
      .map((p) => p.id);

    const bpmProcessIds = processes
      .filter((p) => p.processType === ProcessType.BPM)
      .map((p) => p.id);

    // 2. Batch: WorkItems agrupados por processo+status para processos LIST
    const workItemWhere: Prisma.WorkItemWhereInput = {
      listId: { in: listProcessIds },
      list: { space: { workspaceId } },
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
              spaceId,
              space: { workspaceId },
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

        return {
          ...base,
          totalItems: processItems.length,
          groups,
        };
      }

      return {
        ...base,
        totalOrders: 0,
        ordersByStatus: {},
        pendingActivities: 0,
        pendingHandoffs: 0,
      };
    });
  }
}
