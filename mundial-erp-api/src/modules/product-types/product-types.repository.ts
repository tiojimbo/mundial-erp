import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductTypeCreateInput) {
    return this.prisma.productType.create({ data });
  }

  async findById(id: string) {
    return this.prisma.productType.findFirst({ where: { id, deletedAt: null } });
  }

  async findByPrefix(prefix: string) {
    return this.prisma.productType.findFirst({ where: { prefix, deletedAt: null } });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.productType.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.productType.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.ProductTypeUpdateInput) {
    return this.prisma.productType.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.productType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementSequential(id: string) {
    return this.prisma.productType.update({
      where: { id },
      data: { lastSequential: { increment: 1 } },
    });
  }
}
