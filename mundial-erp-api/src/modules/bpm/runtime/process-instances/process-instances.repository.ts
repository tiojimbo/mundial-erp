import { Injectable } from '@nestjs/common';
import { Prisma, ProcessStatus } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ProcessInstancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProcessInstanceCreateInput) {
    return this.prisma.processInstance.create({ data });
  }

  async findById(id: string) {
    return this.prisma.processInstance.findFirst({
      where: { id, deletedAt: null },
      include: { activityInstances: { where: { deletedAt: null } } },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    orderId?: string;
    processId?: string;
    status?: ProcessStatus;
  }) {
    const { skip = 0, take = 20, orderId, processId, status } = params;

    const where: Prisma.ProcessInstanceWhereInput = {
      deletedAt: null,
      ...(orderId && { orderId }),
      ...(processId && { processId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.processInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.processInstance.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.ProcessInstanceUpdateInput) {
    return this.prisma.processInstance.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.processInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
