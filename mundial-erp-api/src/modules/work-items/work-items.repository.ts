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

  async create(data: Prisma.WorkItemUncheckedCreateInput) {
    return this.prisma.workItem.create({
      data,
      include: { status: true },
    });
  }

  async findById(id: string) {
    return this.prisma.workItem.findFirst({
      where: { id, deletedAt: null },
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

  async findMany(params: WorkItemFindManyParams) {
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

  async findGroupedByStatus(processId: string, showClosed = false) {
    const where: Prisma.WorkItemWhereInput = {
      processId,
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

    // Get all workflow statuses for the process's department
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      select: { departmentId: true },
    });

    const statuses = await this.prisma.workflowStatus.findMany({
      where: {
        departmentId: process?.departmentId ?? undefined,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { items, statuses };
  }

  async update(id: string, data: Prisma.WorkItemUncheckedUpdateInput) {
    return this.prisma.workItem.update({
      where: { id },
      data,
      include: { status: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.workItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkUpdateSortOrder(items: Array<{ id: string; sortOrder: number }>) {
    const updates = items.map((item) =>
      this.prisma.workItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async findProcessById(processId: string) {
    return this.prisma.process.findFirst({
      where: { id: processId, deletedAt: null },
      select: { id: true, departmentId: true },
    });
  }

  async findStatusById(statusId: string) {
    return this.prisma.workflowStatus.findFirst({
      where: { id: statusId, deletedAt: null },
      select: { id: true, departmentId: true, category: true },
    });
  }
}
