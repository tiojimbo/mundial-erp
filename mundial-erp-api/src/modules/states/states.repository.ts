import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StateCreateInput) {
    return this.prisma.state.create({ data });
  }

  async findById(id: string) {
    return this.prisma.state.findUnique({ where: { id } });
  }

  async findByUf(uf: string) {
    return this.prisma.state.findUnique({ where: { uf } });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.state.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.state.count(),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.StateUpdateInput) {
    return this.prisma.state.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.state.delete({ where: { id } });
  }

  async upsertByProFinancasId(proFinancasId: number, data: Omit<Prisma.StateCreateInput, 'proFinancasId'>) {
    const existing = await this.prisma.state.findFirst({
      where: { proFinancasId },
    });
    if (existing) {
      return this.prisma.state.update({ where: { id: existing.id }, data });
    }
    return this.prisma.state.create({ data: { ...data, proFinancasId } });
  }

  async findCitiesByState(stateId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.city.findMany({
        where: { stateId },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.city.count({ where: { stateId } }),
    ]);
    return { items, total };
  }
}
