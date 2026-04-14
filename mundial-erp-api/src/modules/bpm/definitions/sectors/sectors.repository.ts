import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class SectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SectorCreateInput) {
    return this.prisma.sector.create({ data });
  }

  async findById(id: string) {
    return this.prisma.sector.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.sector.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.sector.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.sector.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.SectorUpdateInput) {
    return this.prisma.sector.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.sector.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
