import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority, WorkItemType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface WorkItemFindManyParams {
  skip?: number;
  take?: number;
  processId?: string;
  statusId?: string;
  assigneeId?: string;
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
        process: { department: { workspaceId } },
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
      processId,
      statusId,
      assigneeId,
      priority,
      itemType,
      search,
      showClosed = false,
      showSubtasks = false,
    } = params;

    const where: Prisma.WorkItemWhereInput = {
      deletedAt: null,
      process: { department: { workspaceId } },
    };

    if (processId) where.processId = processId;
    if (statusId) where.statusId = statusId;
    if (assigneeId) where.assigneeId = assigneeId;
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
    processId: string,
    showClosed = false,
  ) {
    const where: Prisma.WorkItemWhereInput = {
      processId,
      process: { department: { workspaceId } },
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

    const process = await this.prisma.process.findFirst({
      where: { id: processId, department: { workspaceId } },
      select: { departmentId: true },
    });

    const statuses = await this.prisma.workflowStatus.findMany({
      where: {
        departmentId: process?.departmentId ?? undefined,
        department: { workspaceId },
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
        assigneeId: userId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      orderBy: [
        { dueDate: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        status: true,
        process: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { name: true } },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findProcessById(workspaceId: string, processId: string) {
    return this.prisma.process.findFirst({
      where: {
        id: processId,
        deletedAt: null,
        OR: [
          { department: { workspaceId } },
          { area: { department: { workspaceId } } },
        ],
      },
      select: { id: true, departmentId: true },
    });
  }

  async findStatusById(workspaceId: string, statusId: string) {
    return this.prisma.workflowStatus.findFirst({
      where: {
        id: statusId,
        deletedAt: null,
        department: { workspaceId },
      },
      select: { id: true, departmentId: true, category: true },
    });
  }
}
