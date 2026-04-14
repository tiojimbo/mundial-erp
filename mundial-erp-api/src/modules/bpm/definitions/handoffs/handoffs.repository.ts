import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class HandoffsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.HandoffCreateInput) {
    return this.prisma.handoff.create({
      data,
      include: {
        fromProcess: { select: { id: true, name: true } },
        toProcess: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.handoff.findFirst({
      where: { id, deletedAt: null },
      include: {
        fromProcess: { select: { id: true, name: true, slug: true } },
        toProcess: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.handoff.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          fromProcess: { select: { id: true, name: true } },
          toProcess: { select: { id: true, name: true } },
        },
      }),
      this.prisma.handoff.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.HandoffUpdateInput) {
    return this.prisma.handoff.update({
      where: { id },
      data,
      include: {
        fromProcess: { select: { id: true, name: true } },
        toProcess: { select: { id: true, name: true } },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.handoff.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
