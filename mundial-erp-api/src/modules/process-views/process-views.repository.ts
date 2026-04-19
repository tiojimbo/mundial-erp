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
      process: {
        OR: [
          { department: { workspaceId } },
          { area: { department: { workspaceId } } },
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
    params: { processId: string; skip?: number; take?: number },
  ) {
    const { processId, skip = 0, take = 50 } = params;
    const where: Prisma.ProcessViewWhereInput = {
      processId,
      deletedAt: null,
      ...this.workspaceProcessFilter(workspaceId),
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

  async unpinAllByProcess(workspaceId: string, processId: string) {
    return this.prisma.processView.updateMany({
      where: {
        processId,
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
      select: { id: true },
    });
  }
}
