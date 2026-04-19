import { Injectable } from '@nestjs/common';
import { Prisma, ProductionOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductionOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    items: {
      where: { deletedAt: null },
      include: { product: true, orderItem: true, unitMeasure: true },
    },
    consumptions: {
      where: { deletedAt: null },
      include: { ingredient: true, unitMeasure: true },
    },
    outputs: {
      where: { deletedAt: null },
      include: { product: true, unitMeasure: true },
    },
    losses: {
      where: { deletedAt: null },
    },
    order: true,
    assignedUser: true,
  };

  async create(data: Prisma.ProductionOrderCreateInput) {
    return this.prisma.productionOrder.create({
      data,
      include: this.defaultInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.productionOrder.findFirst({
      where: { id, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    search?: string;
    orderId?: string;
    status?: ProductionOrderStatus;
  }) {
    const { skip = 0, take = 20, search, orderId, status } = params;

    const where: Prisma.ProductionOrderWhereInput = {
      deletedAt: null,
      ...(orderId && { orderId }),
      ...(status && { status }),
      ...(search && {
        code: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          status: true,
          scheduledDate: true,
          completedDate: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true, title: true } },
          assignedUser: { select: { id: true, name: true } },
          _count: {
            select: {
              items: { where: { deletedAt: null } },
              consumptions: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.productionOrder.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.ProductionOrderUpdateInput) {
    return this.prisma.productionOrder.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  async softDelete(id: string) {
    return this.prisma.productionOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByCode(code: string) {
    return this.prisma.productionOrder.findFirst({
      where: { code, deletedAt: null },
    });
  }

  // --- Order lookup ---
  async findOrderById(orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
  }

  // --- Consumptions ---
  async addConsumption(data: Prisma.ProductionConsumptionCreateInput) {
    return this.prisma.productionConsumption.create({
      data,
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async findConsumptionById(id: string) {
    return this.prisma.productionConsumption.findFirst({
      where: { id, deletedAt: null },
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async updateConsumption(
    id: string,
    data: Prisma.ProductionConsumptionUpdateInput,
  ) {
    return this.prisma.productionConsumption.update({
      where: { id },
      data,
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async removeConsumption(id: string) {
    return this.prisma.productionConsumption.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Outputs ---
  async addOutput(data: Prisma.ProductionOutputCreateInput) {
    return this.prisma.productionOutput.create({
      data,
      include: { product: true, unitMeasure: true },
    });
  }

  async findOutputById(id: string) {
    return this.prisma.productionOutput.findFirst({
      where: { id, deletedAt: null },
      include: { product: true, unitMeasure: true },
    });
  }

  async updateOutput(id: string, data: Prisma.ProductionOutputUpdateInput) {
    return this.prisma.productionOutput.update({
      where: { id },
      data,
      include: { product: true, unitMeasure: true },
    });
  }

  async removeOutput(id: string) {
    return this.prisma.productionOutput.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Losses ---
  async addLoss(data: Prisma.ProductionLossCreateInput) {
    return this.prisma.productionLoss.create({ data });
  }

  async findLossById(id: string) {
    return this.prisma.productionLoss.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async updateLoss(id: string, data: Prisma.ProductionLossUpdateInput) {
    return this.prisma.productionLoss.update({
      where: { id },
      data,
    });
  }

  async removeLoss(id: string) {
    return this.prisma.productionLoss.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
