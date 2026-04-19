import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UnitMeasuresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UnitMeasureCreateInput) {
    return this.prisma.unitMeasure.create({ data });
  }

  async findById(id: string) {
    return this.prisma.unitMeasure.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByName(name: string) {
    return this.prisma.unitMeasure.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;
    const where: Prisma.UnitMeasureWhereInput = {
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.unitMeasure.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.unitMeasure.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.UnitMeasureUpdateInput) {
    return this.prisma.unitMeasure.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.unitMeasure.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
