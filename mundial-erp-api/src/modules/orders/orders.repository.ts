import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
      include: this.fullInclude(),
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async findById(id: string) {
    return this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: OrderStatus;
    clientId?: string;
    createdByUserId?: string;
  }) {
    const { skip = 0, take = 20, search, status, clientId, createdByUserId } = params;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(createdByUserId && { createdByUserId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          { client: { name: { contains: search, mode: 'insensitive' as const } } },
          { client: { cpfCnpj: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          title: true,
          status: true,
          totalCents: true,
          paidAmountCents: true,
          createdAt: true,
          client: { select: { id: true, name: true, cpfCnpj: true } },
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          paymentMethod: { select: { id: true, name: true } },
          _count: { select: { items: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: this.fullInclude(),
    });
  }

  async softDelete(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async generateOrderNumber(): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const record = await tx.orderSequence.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      return record.lastNumber;
    });
    return String(seq).padStart(4, '0');
  }

  async createStatusHistory(data: Prisma.OrderStatusHistoryCreateInput) {
    return this.prisma.orderStatusHistory.create({ data });
  }

  async findStatusHistory(orderId: string) {
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        order: { select: { orderNumber: true } },
      },
    });
  }

  async findOrderWithRelatedEntities(id: string) {
    return this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...this.fullInclude(),
        productionOrders: { where: { deletedAt: null } },
        separationOrders: { where: { deletedAt: null } },
        accountsReceivable: { where: { deletedAt: null } },
        processInstances: true,
      },
    });
  }

  async findItemById(itemId: string) {
    return this.prisma.orderItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: {
        supplies: { where: { deletedAt: null } },
        product: true,
      },
    });
  }

  async createSupply(data: Prisma.OrderItemSupplyCreateInput) {
    return this.prisma.orderItemSupply.create({ data });
  }

  async findSupplyById(supplyId: string) {
    return this.prisma.orderItemSupply.findFirst({
      where: { id: supplyId, deletedAt: null },
    });
  }

  async updateSupply(id: string, data: Prisma.OrderItemSupplyUpdateInput) {
    return this.prisma.orderItemSupply.update({
      where: { id },
      data,
    });
  }

  async updatePayment(id: string, paidAmountCents: number, paymentProofUrl?: string) {
    const data: Prisma.OrderUpdateInput = { paidAmountCents };
    if (paymentProofUrl !== undefined) {
      data.paymentProofUrl = paymentProofUrl;
    }
    return this.prisma.order.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  private fullInclude() {
    return {
      client: true,
      company: true,
      paymentMethod: true,
      carrier: true,
      priceTable: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      orderType: true,
      orderFlow: true,
      orderModel: true,
      items: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' as const },
        include: {
          product: true,
          supplies: { where: { deletedAt: null } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }
}
