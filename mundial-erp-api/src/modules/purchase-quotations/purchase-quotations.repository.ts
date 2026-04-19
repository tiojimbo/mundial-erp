import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PurchaseQuotationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.PurchaseQuotationCreateInput,
    items?: { productId: string; quantity: number; unitPriceCents: number }[],
  ) {
    return this.prisma.purchaseQuotation.create({
      data: {
        ...data,
        ...(items?.length && {
          items: {
            createMany: {
              data: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
              })),
            },
          },
        }),
      },
      include: {
        items: { where: { deletedAt: null } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.purchaseQuotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: { where: { deletedAt: null } },
      },
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

    const where: Prisma.PurchaseQuotationWhereInput = {
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
      this.prisma.purchaseQuotation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseQuotation.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.PurchaseQuotationUpdateInput) {
    return this.prisma.purchaseQuotation.update({
      where: { id },
      data,
      include: {
        items: { where: { deletedAt: null } },
      },
    });
  }

  async updateWithItems(
    quotationId: string,
    data: Prisma.PurchaseQuotationUpdateInput,
    items?: { productId: string; quantity: number; unitPriceCents: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update quotation fields
      await tx.purchaseQuotation.update({
        where: { id: quotationId },
        data,
      });

      // 2. Replace items if provided
      if (items) {
        await tx.purchaseQuotationItem.updateMany({
          where: { quotationId, deletedAt: null },
          data: { deletedAt: new Date() },
        });

        if (items.length > 0) {
          await tx.purchaseQuotationItem.createMany({
            data: items.map((item) => ({
              quotationId,
              productId: item.productId,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
            })),
          });
        }
      }

      // 3. Return updated quotation with items
      return tx.purchaseQuotation.findUniqueOrThrow({
        where: { id: quotationId },
        include: { items: { where: { deletedAt: null } } },
      });
    });
  }

  async findSupplierById(id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async softDelete(id: string) {
    return this.prisma.purchaseQuotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
