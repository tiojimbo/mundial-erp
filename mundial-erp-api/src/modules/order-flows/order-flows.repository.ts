import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrderFlowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrderFlowCreateInput) {
    return this.prisma.orderFlow.create({ data });
  }

  async findById(id: string) {
    return this.prisma.orderFlow.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.orderFlow.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.orderFlow.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.OrderFlowUpdateInput) {
    return this.prisma.orderFlow.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.orderFlow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.OrderFlowCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.orderFlow.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.orderFlow.update({ where: { id: existing.id }, data });
    }
    return this.prisma.orderFlow.create({ data: { ...data, proFinancasId } });
  }
}
