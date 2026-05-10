import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProcessViewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ProcessView NÃO tem workspaceId direto. Escopo via process→department→workspace.
   */
  private workspaceProcessFilter(
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
        ...this.workspaceProcessFilter(workspaceId),
      },
    });
  }

  async findManyByProcess(
    workspaceId: string,
    params: { listId: string; skip?: number; take?: number },
  ) {
    const { listId, skip = 0, take = 50 } = params;
    const where: Prisma.ProcessViewWhereInput = {
      listId,
      deletedAt: null,
      ...this.workspaceProcessFilter(workspaceId),
    };
    const [items, total] = await Promise.all([
      this.prisma.processView.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
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

  async unpinAllByProcess(workspaceId: string, listId: string) {
    return this.prisma.processView.updateMany({
      where: {
        listId,
        deletedAt: null,
        isPinned: true,
        ...this.workspaceProcessFilter(workspaceId),
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
      select: { id: true },
    });
  }
}
