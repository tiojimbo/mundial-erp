import { Injectable } from '@nestjs/common';
import { Prisma, SeparationOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SeparationOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    order: true,
    items: {
      where: { deletedAt: null },
      include: {
        product: true,
        orderItem: true,
      },
    },
  };

  async create(data: Prisma.SeparationOrderCreateInput) {
    return this.prisma.separationOrder.create({
      data,
      include: this.defaultInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.separationOrder.findFirst({
      where: { id, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    orderId?: string;
    status?: SeparationOrderStatus;
    search?: string;
  }) {
    const { skip = 0, take = 20, orderId, status, search } = params;

    const where: Prisma.SeparationOrderWhereInput = {
      deletedAt: null,
      ...(orderId && { orderId }),
      ...(status && { status }),
      ...(search && {
        code: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.separationOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          status: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true, title: true } },
          _count: { select: { items: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.separationOrder.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.SeparationOrderUpdateInput) {
    return this.prisma.separationOrder.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  async softDelete(id: string) {
    return this.prisma.separationOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Order lookup ---
  async findOrderById(orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
  }

  // --- Items ---
  async findItemById(itemId: string) {
    return this.prisma.separationOrderItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { product: true, orderItem: true, separationOrder: true },
    });
  }

  async updateItem(itemId: string, data: Prisma.SeparationOrderItemUpdateInput) {
    return this.prisma.separationOrderItem.update({
      where: { id: itemId },
      data,
      include: { product: true, orderItem: true },
    });
  }
}
