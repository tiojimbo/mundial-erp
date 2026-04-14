import { Injectable } from '@nestjs/common';
import { HandoffStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class HandoffInstancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.HandoffInstanceCreateInput) {
    return this.prisma.handoffInstance.create({ data });
  }

  async findById(id: string) {
    return this.prisma.handoffInstance.findFirst({
      where: { id, deletedAt: null },
      include: { handoff: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    orderId?: string;
    status?: HandoffStatus;
  }) {
    const { skip = 0, take = 20, orderId, status } = params;

    const where: Prisma.HandoffInstanceWhereInput = {
      deletedAt: null,
      ...(orderId && { orderId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.handoffInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.handoffInstance.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.HandoffInstanceUpdateInput) {
    return this.prisma.handoffInstance.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.handoffInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
