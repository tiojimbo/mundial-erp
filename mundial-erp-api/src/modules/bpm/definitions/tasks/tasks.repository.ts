import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskCreateInput) {
    return this.prisma.task.create({ data });
  }

  async findById(id: string) {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        activity: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          activity: { select: { id: true, name: true } },
        },
      }),
      this.prisma.task.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.TaskUpdateInput) {
    return this.prisma.task.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
