import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PriceTablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PriceTableCreateInput, clearOtherDefaults = false) {
    if (clearOtherDefaults) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTable.updateMany({
          where: { isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
        return tx.priceTable.create({ data, include: { items: { include: { product: true } } } });
      });
    }
    return this.prisma.priceTable.create({ data, include: { items: { include: { product: true } } } });
  }

  async findById(id: string) {
    return this.prisma.priceTable.findFirst({
      where: { id, deletedAt: null },
      include: { items: { where: { deletedAt: null }, include: { product: true } } },
    });
  }

  async findMany(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;
    const where: Prisma.PriceTableWhereInput = {
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.priceTable.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.priceTable.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.PriceTableUpdateInput, clearOtherDefaults = false) {
    if (clearOtherDefaults) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTable.updateMany({
          where: { isDefault: true, deletedAt: null, id: { not: id } },
          data: { isDefault: false },
        });
        return tx.priceTable.update({
          where: { id },
          data,
          include: { items: { where: { deletedAt: null }, include: { product: true } } },
        });
      });
    }
    return this.prisma.priceTable.update({
      where: { id },
      data,
      include: { items: { where: { deletedAt: null }, include: { product: true } } },
    });
  }

  async softDelete(id: string) {
    return this.prisma.priceTable.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- PriceTableItem operations ---
  async upsertItem(priceTableId: string, productId: string, priceInCents: number) {
    return this.prisma.priceTableItem.upsert({
      where: {
        priceTableId_productId: { priceTableId, productId },
      },
      update: { priceInCents, deletedAt: null },
      create: {
        priceTable: { connect: { id: priceTableId } },
        product: { connect: { id: productId } },
        priceInCents,
      },
      include: { product: true },
    });
  }

  async findItemsByTableId(priceTableId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const where = { priceTableId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.priceTableItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
      this.prisma.priceTableItem.count({ where }),
    ]);
    return { items, total };
  }

  async removeItem(id: string) {
    return this.prisma.priceTableItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findItemById(id: string) {
    return this.prisma.priceTableItem.findFirst({ where: { id, deletedAt: null } });
  }
}
