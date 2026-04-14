import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({ data });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async findById(id: string) {
    return this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        classification: true,
        deliveryRoute: true,
        defaultPriceTable: true,
        defaultPaymentMethod: true,
      },
    });
  }

  async findByCpfCnpj(cpfCnpj: string) {
    return this.prisma.client.findFirst({
      where: { cpfCnpj, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { tradeName: { contains: search, mode: 'insensitive' as const } },
          { cpfCnpj: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          tradeName: true,
          cpfCnpj: true,
          personType: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          classification: { select: { id: true, name: true } },
          deliveryRoute: { select: { id: true, name: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.ClientUpdateInput) {
    return this.prisma.client.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findOrdersByClientId(clientId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;

    const where: Prisma.OrderWhereInput = {
      clientId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  async getFinancialSummary(clientId: string) {
    const result = await this.prisma.accountReceivable.groupBy({
      by: ['status'],
      where: { clientId, deletedAt: null },
      _sum: { amountCents: true, paidAmountCents: true },
      _count: true,
    });

    let totalAmountCents = 0;
    let totalPaidCents = 0;
    let totalPendingCents = 0;
    let totalOverdueCents = 0;
    let countTotal = 0;
    let countPending = 0;
    let countOverdue = 0;
    let countPaid = 0;

    for (const row of result) {
      const amount = row._sum.amountCents ?? 0;
      const paid = row._sum.paidAmountCents ?? 0;
      totalAmountCents += amount;
      totalPaidCents += paid;
      countTotal += row._count;

      if (row.status === 'PENDING' || row.status === 'PARTIAL') {
        totalPendingCents += amount - paid;
        countPending += row._count;
      } else if (row.status === 'OVERDUE') {
        totalOverdueCents += amount - paid;
        countOverdue += row._count;
      } else if (row.status === 'PAID') {
        countPaid += row._count;
      }
    }

    return {
      totalAmountCents,
      totalPaidCents,
      totalPendingCents,
      totalOverdueCents,
      countTotal,
      countPending,
      countOverdue,
      countPaid,
    };
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.ClientCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: { proFinancasId, deletedAt: null },
    });

    if (existing) {
      return this.prisma.client.update({ where: { id: existing.id }, data });
    }

    return this.prisma.client.create({ data: { ...data, proFinancasId } });
  }
}
