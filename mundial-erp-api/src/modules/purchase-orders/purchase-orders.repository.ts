import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PurchaseOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a PurchaseOrder and its associated AccountPayable in a single transaction.
   * This is the core of the Compras → Financeiro handoff.
   */
  async createWithAccountPayable(data: {
    supplierId: string;
    quotationId: string;
    totalCents: number;
    expectedDeliveryDate?: Date;
    notes?: string;
    itemDescriptions?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock: mark quotation as consumed to prevent race condition
      const quotation = await tx.purchaseQuotation.updateMany({
        where: { id: data.quotationId, status: 'SELECTED', deletedAt: null },
        data: { status: 'ORDERED' },
      });

      if (quotation.count === 0) {
        throw new Error('QUOTATION_ALREADY_CONSUMED');
      }

      // 2. Create PurchaseOrder
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          supplierId: data.supplierId,
          quotationId: data.quotationId,
          status: 'PENDING',
          totalCents: data.totalCents,
          expectedDeliveryDate: data.expectedDeliveryDate,
          notes: data.notes,
        },
      });

      // 3. Auto-create AccountPayable (handoff Compras → Financeiro)
      const apDescription = data.itemDescriptions
        ? `PO ${purchaseOrder.id} — ${data.itemDescriptions}`
        : `Pedido de compra ${purchaseOrder.id}`;

      await tx.accountPayable.create({
        data: {
          supplierId: data.supplierId,
          purchaseOrderId: purchaseOrder.id,
          description: apDescription,
          amountCents: data.totalCents,
          dueDate: data.expectedDeliveryDate ?? new Date(),
          status: 'PENDING',
        },
      });

      // 4. Return PurchaseOrder with AP included
      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id: purchaseOrder.id },
        include: { accountPayable: true },
      });
    });
  }

  async findById(id: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { accountPayable: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    status?: string;
    supplierId?: string;
    search?: string;
  }) {
    const { skip = 0, take = 20, status, supplierId, search } = params;

    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { notes: { contains: search, mode: 'insensitive' as const } },
          {
            supplier: {
              name: { contains: search, mode: 'insensitive' as const },
            },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { accountPayable: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.PurchaseOrderUpdateInput) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: { accountPayable: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
