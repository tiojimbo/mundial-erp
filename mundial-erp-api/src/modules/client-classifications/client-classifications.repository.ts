import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientClassificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ClientClassificationCreateInput) {
    return this.prisma.clientClassification.create({ data });
  }

  async findById(id: string) {
    return this.prisma.clientClassification.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.clientClassification.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.clientClassification.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.ClientClassificationUpdateInput) {
    return this.prisma.clientClassification.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.clientClassification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.ClientClassificationCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.clientClassification.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.clientClassification.update({ where: { id: existing.id }, data });
    }
    return this.prisma.clientClassification.create({ data: { ...data, proFinancasId } });
  }
}
