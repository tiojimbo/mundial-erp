import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

// SCOPE: transitivo — AR via order|client, AP via supplier, Invoice via order|company|client.
@Injectable()
export class FinancialSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private receivableWorkspaceFilter(
    workspaceId: string,
  ): Prisma.AccountReceivableWhereInput {
    return {
      OR: [{ order: { workspaceId } }, { client: { workspaceId } }],
    };
  }

  private payableWorkspaceFilter(
    workspaceId: string,
  ): Prisma.AccountPayableWhereInput {
    return { supplier: { workspaceId } };
  }

  private invoiceWorkspaceFilter(
    workspaceId: string,
  ): Prisma.InvoiceWhereInput {
    return {
      OR: [
        { order: { workspaceId } },
        { company: { workspaceId } },
        { client: { workspaceId } },
      ],
    };
  }

  async aggregateReceivables(workspaceId: string) {
    return this.prisma.accountReceivable.aggregate({
      where: {
        ...this.receivableWorkspaceFilter(workspaceId),
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { amountCents: true, paidAmountCents: true },
    });
  }

  async aggregateOverdueReceivables(workspaceId: string, now: Date) {
    return this.prisma.accountReceivable.aggregate({
      where: {
        ...this.receivableWorkspaceFilter(workspaceId),
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
      _count: true,
    });
  }

  async aggregatePayables(workspaceId: string) {
    return this.prisma.accountPayable.aggregate({
      where: {
        ...this.payableWorkspaceFilter(workspaceId),
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { amountCents: true, paidAmountCents: true },
    });
  }

  async aggregateOverduePayables(workspaceId: string, now: Date) {
    return this.prisma.accountPayable.aggregate({
      where: {
        ...this.payableWorkspaceFilter(workspaceId),
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
      _count: true,
    });
  }

  async aggregateInvoices(workspaceId: string) {
    return this.prisma.invoice.aggregate({
      where: {
        ...this.invoiceWorkspaceFilter(workspaceId),
        deletedAt: null,
        cancelledAt: null,
      },
      _sum: { totalCents: true },
      _count: true,
    });
  }
}
