import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PriceTablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    data: Prisma.PriceTableCreateInput,
    clearOtherDefaults = false,
  ) {
    const dataWithWorkspace = {
      ...data,
      workspace: { connect: { id: workspaceId } },
    };
    if (clearOtherDefaults) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTable.updateMany({
          where: { isDefault: true, workspaceId, deletedAt: null },
          data: { isDefault: false },
        });
        return tx.priceTable.create({
          data: dataWithWorkspace,
          include: { items: { include: { product: true } } },
        });
      });
    }
    return this.prisma.priceTable.create({
      data: dataWithWorkspace,
      include: { items: { include: { product: true } } },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.priceTable.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        items: { where: { deletedAt: null }, include: { product: true } },
      },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number; search?: string },
  ) {
    const { skip = 0, take = 20, search } = params;
    const where: Prisma.PriceTableWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
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

  async update(
    workspaceId: string,
    id: string,
    data: Prisma.PriceTableUpdateInput,
    clearOtherDefaults = false,
  ) {
    if (clearOtherDefaults) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTable.updateMany({
          where: {
            isDefault: true,
            workspaceId,
            deletedAt: null,
            id: { not: id },
          },
          data: { isDefault: false },
        });
        return tx.priceTable.update({
          where: { id },
          data,
          include: {
            items: { where: { deletedAt: null }, include: { product: true } },
          },
        });
      });
    }
    return this.prisma.priceTable.update({
      where: { id },
      data,
      include: {
        items: { where: { deletedAt: null }, include: { product: true } },
      },
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.priceTable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- PriceTableItem operations ---
  async upsertItem(
    _workspaceId: string,
    priceTableId: string,
    productId: string,
    priceInCents: number,
  ) {
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

  async findItemsByTableId(
    workspaceId: string,
    priceTableId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.PriceTableItemWhereInput = {
      priceTableId,
      priceTable: { workspaceId },
      deletedAt: null,
    };
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

  async removeItem(_workspaceId: string, id: string) {
    return this.prisma.priceTableItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findItemById(workspaceId: string, id: string) {
    return this.prisma.priceTableItem.findFirst({
      where: { id, deletedAt: null, priceTable: { workspaceId } },
    });
  }
}
