import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  async findById(id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByCpfCnpj(cpfCnpj: string) {
    return this.prisma.supplier.findFirst({
      where: { cpfCnpj, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.SupplierWhereInput = {
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
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findPurchaseHistory(supplierId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;

    const where: Prisma.PurchaseOrderWhereInput = {
      supplierId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total };
  }

  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.SupplierCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.supplier.findFirst({
      where: { proFinancasId, deletedAt: null },
    });

    if (existing) {
      return this.prisma.supplier.update({ where: { id: existing.id }, data });
    }

    return this.prisma.supplier.create({ data: { ...data, proFinancasId } });
  }
}
