import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccountsPayableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AccountPayableCreateInput) {
    return this.prisma.accountPayable.create({
      data,
      include: { supplier: true, purchaseOrder: true, category: true },
    });
  }

  async findById(id: string) {
    return this.prisma.accountPayable.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        purchaseOrder: true,
        category: true,
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    supplierId?: string;
    status?: PaymentStatus;
    categoryId?: string;
    overdue?: boolean;
  }) {
    const { skip = 0, take = 20, supplierId, status, categoryId, overdue } = params;

    const where: Prisma.AccountPayableWhereInput = {
      deletedAt: null,
      ...(supplierId && { supplierId }),
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(overdue && {
        dueDate: { lt: new Date() },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.accountPayable.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          description: true,
          amountCents: true,
          paidAmountCents: true,
          dueDate: true,
          paidDate: true,
          status: true,
          createdAt: true,
          supplier: { select: { id: true, name: true } },
          purchaseOrder: { select: { id: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.accountPayable.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.AccountPayableUpdateInput) {
    return this.prisma.accountPayable.update({
      where: { id },
      data,
      include: {
        supplier: true,
        purchaseOrder: true,
        category: true,
      },
    });
  }

  async registerPaymentAtomically(
    id: string,
    paymentAmountCents: number,
    paidDate: Date | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.accountPayable.findFirst({
        where: { id, deletedAt: null },
      });

      if (!entity) return null;

      const newPaidAmount = entity.paidAmountCents + paymentAmountCents;
      const isPaid = newPaidAmount >= entity.amountCents;

      return tx.accountPayable.update({
        where: { id },
        data: {
          paidAmountCents: newPaidAmount,
          status: isPaid ? 'PAID' : 'PARTIAL',
          ...(isPaid && { paidDate: paidDate ?? new Date() }),
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          category: true,
        },
      });
    });
  }

  async softDelete(id: string) {
    return this.prisma.accountPayable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
