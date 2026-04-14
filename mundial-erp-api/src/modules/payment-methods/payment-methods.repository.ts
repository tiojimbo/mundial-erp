import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PaymentMethodCreateInput) {
    return this.prisma.paymentMethod.create({ data });
  }

  async findById(id: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.paymentMethod.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.PaymentMethodUpdateInput) {
    return this.prisma.paymentMethod.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.PaymentMethodCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { proFinancasId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.paymentMethod.update({ where: { id: existing.id }, data });
    }
    return this.prisma.paymentMethod.create({ data: { ...data, proFinancasId } });
  }
}
