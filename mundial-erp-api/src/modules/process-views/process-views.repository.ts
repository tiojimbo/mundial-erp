import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProcessViewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProcessViewUncheckedCreateInput) {
    return this.prisma.processView.create({ data });
  }

  async findById(id: string) {
    return this.prisma.processView.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findManyByProcess(params: { processId: string; skip?: number; take?: number }) {
    const { processId, skip = 0, take = 50 } = params;
    const where: Prisma.ProcessViewWhereInput = {
      processId,
      deletedAt: null,
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

  async update(id: string, data: Prisma.ProcessViewUpdateInput) {
    return this.prisma.processView.update({ where: { id }, data });
  }

  async unpinAllByProcess(processId: string) {
    return this.prisma.processView.updateMany({
      where: { processId, deletedAt: null, isPinned: true },
      data: { isPinned: false },
    });
  }

  async softDelete(id: string) {
    return this.prisma.processView.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
