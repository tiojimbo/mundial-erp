import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrderTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrderTypeCreateInput) {
    return this.prisma.orderType.create({ data });
  }

  async findById(id: string) {
    return this.prisma.orderType.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.orderType.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.orderType.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.OrderTypeUpdateInput) {
    return this.prisma.orderType.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.orderType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.OrderTypeCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.orderType.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.orderType.update({ where: { id: existing.id }, data });
    }
    return this.prisma.orderType.create({ data: { ...data, proFinancasId } });
  }
}
