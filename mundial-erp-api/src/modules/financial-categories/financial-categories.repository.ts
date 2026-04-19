import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinancialCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.FinancialCategoryCreateInput) {
    return this.prisma.financialCategory.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.financialCategory.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
    });
  }

  async findMany(
    workspaceId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
      type?: string;
    },
  ) {
    const { skip = 0, take = 20, search, type } = params;

    const where: Prisma.FinancialCategoryWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
      ...(type && { type }),
    };

    const [items, total] = await Promise.all([
      this.prisma.financialCategory.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { children: { where: { deletedAt: null } } },
      }),
      this.prisma.financialCategory.count({ where }),
    ]);

    return { items, total };
  }

  async findRoots(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;

    const where: Prisma.FinancialCategoryWhereInput = {
      workspaceId,
      deletedAt: null,
      parentId: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.financialCategory.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { children: { where: { deletedAt: null } } },
      }),
      this.prisma.financialCategory.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.FinancialCategoryUpdateInput,
  ) {
    return this.prisma.financialCategory.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.financialCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
