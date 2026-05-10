import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ViewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private workspaceListFilter(
    workspaceId: string,
  ): Prisma.ProcessViewWhereInput {
    return {
      list: {
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
    };
  }

  async create(
    _workspaceId: string,
    data: Prisma.ProcessViewUncheckedCreateInput,
  ) {
    return this.prisma.processView.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.processView.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.workspaceListFilter(workspaceId),
      },
    });
  }

  async findManyByList(
    workspaceId: string,
    params: { listId: string; skip?: number; take?: number },
  ) {
    const { listId, skip = 0, take = 50 } = params;
    const where: Prisma.ProcessViewWhereInput = {
      listId,
      deletedAt: null,
      ...this.workspaceListFilter(workspaceId),
    };
    const [items, total] = await Promise.all([
      this.prisma.processView.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.processView.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.ProcessViewUpdateInput,
  ) {
    return this.prisma.processView.update({ where: { id }, data });
  }

  async unpinAllByList(workspaceId: string, listId: string) {
    return this.prisma.processView.updateMany({
      where: {
        listId,
        deletedAt: null,
        isPinned: true,
        ...this.workspaceListFilter(workspaceId),
      },
      data: { isPinned: false },
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.processView.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findListById(workspaceId: string, listId: string) {
    return this.prisma.list.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: { id: true },
    });
  }
}
