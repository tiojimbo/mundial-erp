import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
      include: this.fullInclude(),
    });
  }

  async exists(workspaceId: string, id: string): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: { id, workspaceId, deletedAt: null },
    });
    return count > 0;
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findMany(
    workspaceId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
      status?: OrderStatus;
      clientId?: string;
      createdByUserId?: string;
    },
  ) {
    const {
      skip = 0,
      take = 20,
      search,
      status,
      clientId,
      createdByUserId,
    } = params;

    const where: Prisma.OrderWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(createdByUserId && { createdByUserId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          {
            client: {
              name: { contains: search, mode: 'insensitive' as const },
            },
          },
          {
            client: {
              cpfCnpj: { contains: search, mode: 'insensitive' as const },
            },
          },
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

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.OrderUpdateInput,
  ) {
    return this.prisma.order.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async updateStatus(_workspaceId: string, id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: this.fullInclude(),
    });
  }

  async softDelete(_workspaceId: string, id: string) {
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

  async findStatusHistory(workspaceId: string, orderId: string) {
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId, order: { workspaceId } },
      orderBy: { createdAt: 'asc' },
      include: {
        order: { select: { orderNumber: true } },
      },
    });
  }

  async findOrderWithRelatedEntities(workspaceId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        ...this.fullInclude(),
        productionOrders: { where: { deletedAt: null } },
        separationOrders: { where: { deletedAt: null } },
        accountsReceivable: { where: { deletedAt: null } },
        processInstances: true,
      },
    });
  }

  async findItemById(workspaceId: string, itemId: string) {
    return this.prisma.orderItem.findFirst({
      where: { id: itemId, deletedAt: null, order: { workspaceId } },
      include: {
        supplies: { where: { deletedAt: null } },
        product: true,
      },
    });
  }

  async createSupply(data: Prisma.OrderItemSupplyCreateInput) {
    return this.prisma.orderItemSupply.create({ data });
  }

  async findSupplyById(workspaceId: string, supplyId: string) {
    return this.prisma.orderItemSupply.findFirst({
      where: {
        id: supplyId,
        deletedAt: null,
        orderItem: { order: { workspaceId } },
      },
    });
  }

  async updateSupply(id: string, data: Prisma.OrderItemSupplyUpdateInput) {
    return this.prisma.orderItemSupply.update({
      where: { id },
      data,
    });
  }

  async updatePayment(
    _workspaceId: string,
    id: string,
    paidAmountCents: number,
    paymentProofUrl?: string,
  ) {
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
