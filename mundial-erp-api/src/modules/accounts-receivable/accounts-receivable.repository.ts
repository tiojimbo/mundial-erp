import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccountsReceivableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AccountReceivableCreateInput) {
    return this.prisma.accountReceivable.create({
      data,
      include: this.fullInclude(),
    });
  }

  async findById(id: string) {
    return this.prisma.accountReceivable.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    clientId?: string;
    status?: PaymentStatus;
    overdue?: boolean;
  }) {
    const { skip = 0, take = 20, clientId, status, overdue } = params;

    const where: Prisma.AccountReceivableWhereInput = {
      deletedAt: null,
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(overdue && {
        dueDate: { lt: new Date() },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        select: this.listSelect(),
      }),
      this.prisma.accountReceivable.count({ where }),
    ]);

    return { items, total };
  }

  async findByClientId(
    clientId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;

    const where: Prisma.AccountReceivableWhereInput = {
      clientId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        select: this.listSelect(),
      }),
      this.prisma.accountReceivable.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.AccountReceivableUpdateInput) {
    return this.prisma.accountReceivable.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async registerPaymentAtomically(
    id: string,
    paymentAmountCents: number,
    paidDate: Date | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.accountReceivable.findFirst({
        where: { id, deletedAt: null },
      });

      if (!entity) return null;

      const newPaidAmount = entity.paidAmountCents + paymentAmountCents;
      const isPaid = newPaidAmount >= entity.amountCents;

      return tx.accountReceivable.update({
        where: { id },
        data: {
          paidAmountCents: newPaidAmount,
          status: isPaid ? 'PAID' : 'PARTIAL',
          ...(isPaid && { paidDate: paidDate ?? new Date() }),
        },
        include: this.fullInclude(),
      });
    });
  }

  async softDelete(id: string) {
    return this.prisma.accountReceivable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private listSelect() {
    return {
      id: true,
      description: true,
      amountCents: true,
      paidAmountCents: true,
      dueDate: true,
      paidDate: true,
      status: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true } },
      invoice: { select: { id: true, number: true } },
    };
  }

  private fullInclude() {
    return {
      client: true,
      order: true,
      invoice: true,
    };
  }
}
