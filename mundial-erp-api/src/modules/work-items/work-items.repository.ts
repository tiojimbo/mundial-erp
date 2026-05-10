import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority, WorkItemType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Parametros internos de busca. Campo `primaryAssigneeCache` corresponde
 * ao campo Prisma renomeado (ADR-001). DTO externo `WorkItemFiltersDto.assigneeId`
 * continua existindo para compat de API; service faz o mapeamento.
 */
export interface WorkItemFindManyParams {
  skip?: number;
  take?: number;
  listId?: string;
  statusId?: string;
  primaryAssigneeCache?: string;
  priority?: TaskPriority;
  itemType?: WorkItemType;
  search?: string;
  showClosed?: boolean;
  showSubtasks?: boolean;
}

@Injectable()
export class WorkItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * WorkItem NÃO possui workspaceId direto. Escopo via process→department→workspace.
   */
  async create(
    _workspaceId: string,
    data: Prisma.WorkItemUncheckedCreateInput,
  ) {
    return this.prisma.workItem.create({
      data,
      include: { status: true },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      include: {
        status: true,
        children: {
          where: { deletedAt: null },
          include: { status: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findMany(workspaceId: string, params: WorkItemFindManyParams) {
    const {
      skip = 0,
      take = 20,
      listId,
      statusId,
      primaryAssigneeCache,
      priority,
      itemType,
      search,
      showClosed = false,
      showSubtasks = false,
    } = params;

    const where: Prisma.WorkItemWhereInput = {
      deletedAt: null,
      list: { space: { workspaceId } },
    };

    if (listId) where.listId = listId;
    if (statusId) where.statusId = statusId;
    if (primaryAssigneeCache)
      where.primaryAssigneeCache = primaryAssigneeCache;
    if (priority) where.priority = priority;
    if (itemType) where.itemType = itemType;

    if (!showClosed) {
      where.closedAt = null;
    }

    if (!showSubtasks) {
      where.parentId = null;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.workItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: { status: true },
      }),
      this.prisma.workItem.count({ where }),
    ]);

    return { items, total };
  }

  async findGroupedByStatus(
    workspaceId: string,
    listId: string,
    showClosed = false,
  ) {
    const where: Prisma.WorkItemWhereInput = {
      listId,
      list: { space: { workspaceId } },
      deletedAt: null,
      parentId: null,
    };

    if (!showClosed) {
      where.closedAt = null;
    }

    const items = await this.prisma.workItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { status: true },
    });

    const process = await this.prisma.list.findFirst({
      where: { id: listId, space: { workspaceId } },
      select: { spaceId: true },
    });

    const statuses = await this.prisma.workflowStatus.findMany({
      where: {
        spaceId: process?.spaceId ?? undefined,
        space: { workspaceId },
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { items, statuses };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.WorkItemUncheckedUpdateInput,
  ) {
    return this.prisma.workItem.update({
      where: { id },
      data,
      include: { status: true },
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.workItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkUpdateSortOrder(
    _workspaceId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ) {
    const updates = items.map((item) =>
      this.prisma.workItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async findByAssignee(workspaceId: string, userId: string) {
    return this.prisma.workItem.findMany({
      where: {
        // Campo renomeado (ADR-001). Fonte multi-assignee migrara em Sprint 2
        // (join WorkItemAssignee); cache continua servindo o hot path.
        primaryAssigneeCache: userId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      orderBy: [
        { dueDate: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        status: true,
        list: {
          select: {
            id: true,
            name: true,
            spaceId: true,
            space: { select: { name: true } },
          },
        },
        primaryAssignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findProcessById(workspaceId: string, listId: string) {
    return this.prisma.list.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: { id: true, spaceId: true },
    });
  }

  async findStatusById(workspaceId: string, statusId: string) {
    return this.prisma.workflowStatus.findFirst({
      where: {
        id: statusId,
        deletedAt: null,
        space: { workspaceId },
      },
      select: { id: true, spaceId: true, category: true },
    });
  }
}
