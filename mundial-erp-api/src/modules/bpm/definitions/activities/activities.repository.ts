import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ActivityCreateInput) {
    return this.prisma.activity.create({ data });
  }

  async findById(id: string) {
    return this.prisma.activity.findFirst({
      where: { id, deletedAt: null },
      include: {
        process: { select: { id: true, name: true, slug: true } },
        tasks: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.activity.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          process: { select: { id: true, name: true } },
        },
      }),
      this.prisma.activity.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.ActivityUpdateInput) {
    return this.prisma.activity.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
