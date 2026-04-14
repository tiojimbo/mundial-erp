import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinancialSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateReceivables() {
    return this.prisma.accountReceivable.aggregate({
      where: { deletedAt: null, status: { not: 'CANCELLED' } },
      _sum: { amountCents: true, paidAmountCents: true },
    });
  }

  async aggregateOverdueReceivables(now: Date) {
    return this.prisma.accountReceivable.aggregate({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
      _count: true,
    });
  }

  async aggregatePayables() {
    return this.prisma.accountPayable.aggregate({
      where: { deletedAt: null, status: { not: 'CANCELLED' } },
      _sum: { amountCents: true, paidAmountCents: true },
    });
  }

  async aggregateOverduePayables(now: Date) {
    return this.prisma.accountPayable.aggregate({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
      _count: true,
    });
  }

  async aggregateInvoices() {
    return this.prisma.invoice.aggregate({
      where: { deletedAt: null, cancelledAt: null },
      _sum: { totalCents: true },
      _count: true,
    });
  }
}
