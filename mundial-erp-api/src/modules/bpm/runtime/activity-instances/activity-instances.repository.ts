import { Injectable } from '@nestjs/common';
import { ActivityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ActivityInstancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ActivityInstanceCreateInput) {
    return this.prisma.activityInstance.create({ data });
  }

  async findById(id: string) {
    return this.prisma.activityInstance.findFirst({
      where: { id, deletedAt: null },
      include: { taskInstances: { where: { deletedAt: null } } },
    });
  }

  async findByIdWithMandatoryTasks(id: string) {
    return this.prisma.activityInstance.findFirst({
      where: { id, deletedAt: null },
      include: {
        taskInstances: {
          where: { deletedAt: null },
          include: { task: true },
        },
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    processInstanceId?: string;
    assignedUserId?: string;
    status?: ActivityStatus;
  }) {
    const { skip = 0, take = 20, processInstanceId, assignedUserId, status } =
      params;

    const where: Prisma.ActivityInstanceWhereInput = {
      deletedAt: null,
      ...(processInstanceId && { processInstanceId }),
      ...(assignedUserId && { assignedUserId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.activityInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityInstance.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.ActivityInstanceUpdateInput) {
    return this.prisma.activityInstance.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.activityInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
