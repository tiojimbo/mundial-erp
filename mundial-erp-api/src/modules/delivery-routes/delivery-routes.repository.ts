import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DeliveryRoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DeliveryRouteCreateInput) {
    return this.prisma.deliveryRoute.create({ data });
  }

  async findById(id: string) {
    return this.prisma.deliveryRoute.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.deliveryRoute.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.deliveryRoute.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.DeliveryRouteUpdateInput) {
    return this.prisma.deliveryRoute.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.deliveryRoute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.DeliveryRouteCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.deliveryRoute.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.deliveryRoute.update({ where: { id: existing.id }, data });
    }
    return this.prisma.deliveryRoute.create({ data: { ...data, proFinancasId } });
  }
}
