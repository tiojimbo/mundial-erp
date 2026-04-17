import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ProcessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProcessCreateInput) {
    return this.prisma.process.create({ data });
  }

  async findById(id: string) {
    return this.prisma.process.findFirst({
      where: { id, deletedAt: null },
      include: {
        sector: { select: { id: true, name: true, slug: true } },
        _count: { select: { activities: { where: { deletedAt: null } } } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.process.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.process.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          sector: { select: { id: true, name: true } },
        },
      }),
      this.prisma.process.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.ProcessUpdateInput) {
    return this.prisma.process.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.process.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAreaById(areaId: string) {
    return this.prisma.area.findFirst({
      where: { id: areaId, deletedAt: null },
      select: { id: true, departmentId: true },
    });
  }

  async createWithDefaultView(data: Prisma.ProcessCreateInput) {
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

  async findBySlugWithDetails(slug: string) {
    return this.prisma.process.findFirst({
      where: { slug, deletedAt: null },
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
