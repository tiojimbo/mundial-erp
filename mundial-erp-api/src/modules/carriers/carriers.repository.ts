import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CarriersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CarrierCreateInput) {
    return this.prisma.carrier.create({ data });
  }

  async findById(id: string) {
    return this.prisma.carrier.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.carrier.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.carrier.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.CarrierUpdateInput) {
    return this.prisma.carrier.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.carrier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.CarrierCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.carrier.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.carrier.update({ where: { id: existing.id }, data });
    }
    return this.prisma.carrier.create({ data: { ...data, proFinancasId } });
  }
}
