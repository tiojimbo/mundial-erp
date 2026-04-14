import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class TaskInstancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskInstanceCreateInput) {
    return this.prisma.taskInstance.create({ data });
  }

  async findById(id: string) {
    return this.prisma.taskInstance.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    activityInstanceId?: string;
  }) {
    const { skip = 0, take = 20, activityInstanceId } = params;

    const where: Prisma.TaskInstanceWhereInput = {
      deletedAt: null,
      ...(activityInstanceId && { activityInstanceId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.taskInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taskInstance.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.TaskInstanceUpdateInput) {
    return this.prisma.taskInstance.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.taskInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
