import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CityCreateInput) {
    return this.prisma.city.create({ data });
  }

  async findById(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      include: { state: true },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.city.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.city.count(),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.CityUpdateInput) {
    return this.prisma.city.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.city.delete({ where: { id } });
  }

  async upsertByProFinancasId(proFinancasId: number, data: Omit<Prisma.CityCreateInput, 'proFinancasId'>) {
    const existing = await this.prisma.city.findFirst({
      where: { proFinancasId },
    });
    if (existing) {
      return this.prisma.city.update({ where: { id: existing.id }, data });
    }
    return this.prisma.city.create({ data: { ...data, proFinancasId } });
  }

  async findNeighborhoodsByCity(cityId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.neighborhood.findMany({
        where: { cityId },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.neighborhood.count({ where: { cityId } }),
    ]);
    return { items, total };
  }
}
