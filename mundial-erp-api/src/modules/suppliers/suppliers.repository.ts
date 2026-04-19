import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByCpfCnpj(workspaceId: string, cpfCnpj: string) {
    return this.prisma.supplier.findFirst({
      where: { cpfCnpj, workspaceId, deletedAt: null },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number; search?: string },
  ) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.SupplierWhereInput = {
      workspaceId,
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

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.SupplierUpdateInput,
  ) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findPurchaseHistory(
    workspaceId: string,
    supplierId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;

    const where: Prisma.PurchaseOrderWhereInput = {
      supplierId,
      supplier: { workspaceId },
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

  /**
   * Sync-only: usado por SyncService. Não recebe workspaceId.
   */
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
