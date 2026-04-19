import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrderModelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrderModelCreateInput) {
    return this.prisma.orderModel.create({ data });
  }

  async findById(id: string) {
    return this.prisma.orderModel.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.orderModel.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.orderModel.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.OrderModelUpdateInput) {
    return this.prisma.orderModel.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.orderModel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.OrderModelCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.orderModel.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.orderModel.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.orderModel.create({ data: { ...data, proFinancasId } });
  }
}
