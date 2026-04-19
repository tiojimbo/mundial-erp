import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.company.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByCnpj(workspaceId: string, cnpj: string) {
    return this.prisma.company.findFirst({
      where: { cnpj, workspaceId, deletedAt: null },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number; search?: string },
  ) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.CompanyWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { tradeName: { contains: search, mode: 'insensitive' as const } },
          { cnpj: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.CompanyUpdateInput,
  ) {
    return this.prisma.company.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Sync-only: usado por SyncService. Não recebe workspaceId.
   */
  async upsertByProFinancasId(
    proFinancasId: number,
    data: Omit<Prisma.CompanyCreateInput, 'proFinancasId'>,
  ) {
    const existing = await this.prisma.company.findFirst({
      where: { proFinancasId, deletedAt: null },
    });

    if (existing) {
      return this.prisma.company.update({ where: { id: existing.id }, data });
    }

    return this.prisma.company.create({ data: { ...data, proFinancasId } });
  }
}
