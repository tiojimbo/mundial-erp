import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AreaCreateInput) {
    return this.prisma.area.create({ data });
  }

  async findById(id: string) {
    return this.prisma.area.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.area.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.area.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.area.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.AreaUpdateInput) {
    return this.prisma.area.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.area.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
