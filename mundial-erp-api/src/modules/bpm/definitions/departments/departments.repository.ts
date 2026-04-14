import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({ data });
  }

  async findById(id: string) {
    return this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: { sectors: { where: { deletedAt: null } } },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.department.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.department.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.DepartmentUpdateInput) {
    return this.prisma.department.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSidebarTree() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        isPrivate: true,
        isDefault: true,
        isProtected: true,
        sortOrder: true,
        areas: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
            isDefault: true,
            processes: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                slug: true,
                processType: true,
                featureRoute: true,
                isProtected: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });
  }
}
