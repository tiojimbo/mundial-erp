import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NeighborhoodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.NeighborhoodCreateInput) {
    return this.prisma.neighborhood.create({ data });
  }

  async findById(id: string) {
    return this.prisma.neighborhood.findUnique({
      where: { id },
      include: { city: true },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.neighborhood.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.neighborhood.count(),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.NeighborhoodUpdateInput) {
    return this.prisma.neighborhood.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.neighborhood.delete({ where: { id } });
  }

  async upsertByProFinancasId(proFinancasId: number, data: Omit<Prisma.NeighborhoodCreateInput, 'proFinancasId'>) {
    const existing = await this.prisma.neighborhood.findFirst({
      where: { proFinancasId },
    });
    if (existing) {
      return this.prisma.neighborhood.update({ where: { id: existing.id }, data });
    }
    return this.prisma.neighborhood.create({ data: { ...data, proFinancasId } });
  }
}
