import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ProcessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process NÃO possui workspaceId direto. Escopo via department (direto OU via area).
   */
  private workspaceFilter(workspaceId: string): Prisma.ProcessWhereInput {
    return {
      OR: [
        { department: { workspaceId } },
        { area: { department: { workspaceId } } },
      ],
    };
  }

  async create(_workspaceId: string, data: Prisma.ProcessCreateInput) {
    return this.prisma.process.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.process.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: {
        sector: { select: { id: true, name: true, slug: true } },
        _count: { select: { activities: { where: { deletedAt: null } } } },
      },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.process.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.ProcessWhereInput = {
      deletedAt: null,
      ...this.workspaceFilter(workspaceId),
    };
    const [items, total] = await Promise.all([
      this.prisma.process.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          sector: { select: { id: true, name: true } },
        },
      }),
      this.prisma.process.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.ProcessUpdateInput,
  ) {
    return this.prisma.process.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.process.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAreaById(workspaceId: string, areaId: string) {
    return this.prisma.area.findFirst({
      where: { id: areaId, deletedAt: null, department: { workspaceId } },
      select: { id: true, departmentId: true },
    });
  }

  async createWithDefaultView(
    _workspaceId: string,
    data: Prisma.ProcessCreateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const process = await tx.process.create({ data });
      await tx.processView.create({
        data: {
          name: 'Lista',
          viewType: 'LIST',
          isPinned: true,
          process: { connect: { id: process.id } },
        },
      });
      return process;
    });
  }

  async findBySlugWithDetails(workspaceId: string, slug: string) {
    return this.prisma.process.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: {
        sector: { select: { id: true, name: true, slug: true } },
        area: {
          select: {
            id: true,
            name: true,
            slug: true,
            departmentId: true,
            department: { select: { name: true, slug: true } },
          },
        },
        department: { select: { id: true, name: true, slug: true } },
        _count: { select: { activities: { where: { deletedAt: null } } } },
      },
    });
  }
}
