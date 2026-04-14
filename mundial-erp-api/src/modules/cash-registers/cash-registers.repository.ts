import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CashRegistersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CashRegisterCreateInput) {
    return this.prisma.cashRegister.create({
      data,
      include: { company: true, openedBy: true, closedBy: true },
    });
  }

  async openAtomically(companyId: string, userId: string, openingBalanceCents: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cashRegister.findFirst({
        where: { companyId, closedAt: null, deletedAt: null },
      });

      if (existing) return null;

      return tx.cashRegister.create({
        data: {
          company: { connect: { id: companyId } },
          openedBy: { connect: { id: userId } },
          openedAt: new Date(),
          openingBalanceCents,
        },
        include: { company: true, openedBy: true, closedBy: true },
      });
    });
  }

  async findById(id: string) {
    return this.prisma.cashRegister.findFirst({
      where: { id, deletedAt: null },
      include: { company: true, openedBy: true, closedBy: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    companyId?: string;
    isOpen?: boolean;
  }) {
    const { skip = 0, take = 20, companyId, isOpen } = params;

    const where: Prisma.CashRegisterWhereInput = { deletedAt: null };

    if (companyId) {
      where.companyId = companyId;
    }

    if (isOpen === true) {
      where.closedAt = null;
    } else if (isOpen === false) {
      where.closedAt = { not: null };
    }

    const [items, total] = await Promise.all([
      this.prisma.cashRegister.findMany({
        where,
        skip,
        take,
        orderBy: { openedAt: 'desc' },
        select: {
          id: true,
          openedAt: true,
          closedAt: true,
          openingBalanceCents: true,
          closingBalanceCents: true,
          company: { select: { id: true, tradeName: true } },
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.cashRegister.count({ where }),
    ]);

    return { items, total };
  }

  async findOpenByCompany(companyId: string) {
    return this.prisma.cashRegister.findFirst({
      where: { companyId, closedAt: null, deletedAt: null },
    });
  }

  async update(id: string, data: Prisma.CashRegisterUpdateInput) {
    return this.prisma.cashRegister.update({
      where: { id },
      data,
      include: { company: true, openedBy: true, closedBy: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.cashRegister.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
