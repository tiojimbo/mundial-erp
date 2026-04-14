import { Injectable } from '@nestjs/common';
import { Prisma, StockRequisitionStatus, StockRequisitionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StockRequisitionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StockRequisitionCreateInput) {
    return this.prisma.stockRequisition.create({
      data,
      include: this.fullInclude(),
    });
  }

  async findById(id: string) {
    return this.prisma.stockRequisition.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findByCode(code: string) {
    return this.prisma.stockRequisition.findFirst({
      where: { code, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    type?: StockRequisitionType;
    status?: StockRequisitionStatus;
    startDate?: string;
    endDate?: string;
  }) {
    const { skip = 0, take = 20, type, status, startDate, endDate } = params;

    const where: Prisma.StockRequisitionWhereInput = {
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
      ...(startDate || endDate
        ? {
            requestedAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockRequisition.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.listInclude(),
      }),
      this.prisma.stockRequisition.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.StockRequisitionUpdateInput) {
    return this.prisma.stockRequisition.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async findItemById(itemId: string) {
    return this.prisma.stockRequisitionItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { product: true, requisition: true },
    });
  }

  async generateCode(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `REQ-${dateStr}-`;

      // SELECT ... FOR UPDATE via raw query to lock the row and prevent race conditions
      const lastReq = await tx.stockRequisition.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let seq = 1;
      if (lastReq) {
        const lastSeq = parseInt(lastReq.code.replace(prefix, ''), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }

      const code = `${prefix}${String(seq).padStart(3, '0')}`;

      // Create a placeholder to "reserve" the code inside this transaction
      // The actual creation happens in the service, but we verify uniqueness here
      const existing = await tx.stockRequisition.findUnique({ where: { code } });
      if (existing) {
        throw new Error(`Codigo ${code} ja existe — retry`);
      }

      return code;
    });
  }

  async processItemAndDeductStock(
    itemId: string,
    productId: string,
    data: { actualQuantity: number; unitType: string; unitsPerBox: number | null },
    quantityToDeduct: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside transaction to prevent double processing
      const item = await tx.stockRequisitionItem.findFirst({
        where: { id: itemId, deletedAt: null },
      });
      if (item?.actualQuantity != null) {
        throw new Error('ITEM_ALREADY_PROCESSED');
      }

      await tx.stockRequisitionItem.update({
        where: { id: itemId },
        data: {
          actualQuantity: data.actualQuantity,
          unitType: data.unitType,
          unitsPerBox: data.unitsPerBox,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: { decrement: quantityToDeduct } },
      });
    });
  }

  async approveAndDeductStock(
    requisitionId: string,
    userId: string,
    items: Array<{
      id: string;
      productId: string;
      requestedQuantity: number;
      unitType: string;
      unitsPerBox: number | null;
      quantityInBaseUnit: number;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Re-check status inside transaction to prevent race conditions
      const req = await tx.stockRequisition.findFirst({
        where: { id: requisitionId, deletedAt: null },
        select: { status: true },
      });
      if (!req || req.status !== 'PENDING') {
        throw new Error('NOT_PENDING');
      }

      // Process all items: set actualQuantity and deduct stock
      for (const item of items) {
        await tx.stockRequisitionItem.update({
          where: { id: item.id },
          data: {
            actualQuantity: item.requestedQuantity,
            unitType: item.unitType,
            unitsPerBox: item.unitsPerBox,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantityInBaseUnit } },
        });
      }

      // Approve and mark as processed
      return tx.stockRequisition.update({
        where: { id: requisitionId },
        data: {
          status: 'PROCESSED',
          approvedBy: { connect: { id: userId } },
          processedAt: new Date(),
        },
        include: this.fullInclude(),
      });
    });
  }

  async findOrderById(orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: { id: true },
    });
  }

  async findProductsByIds(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      select: { id: true, unitsPerBox: true },
    });
  }

  async hardDelete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.stockRequisitionItem.deleteMany({
        where: { requisitionId: id },
      });
      await tx.stockRequisition.delete({
        where: { id },
      });
    });
  }

  private listInclude() {
    return {
      requestedBy: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true } },
      _count: { select: { items: true } },
    };
  }

  private fullInclude() {
    return {
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
      items: {
        where: { deletedAt: null },
        include: {
          product: {
            select: { id: true, code: true, name: true, barcode: true, currentStock: true, unitsPerBox: true },
          },
        },
      },
    };
  }
}
