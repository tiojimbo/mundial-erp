import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderStatus,
  PaymentStatus,
  ProductionOrderStatus,
  SeparationOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → CANCELADO
 *
 * - Estorna AR (marca como CANCELLED)
 * - Cancela ProductionOrders pendentes
 * - Encerra ProcessInstances
 */
@Injectable()
export class OrderCanceladoListener {
  private readonly logger = new Logger(OrderCanceladoListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.CANCELADO) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) return;

    // Estornar AR: marcar como CANCELLED
    const arCount = await this.prisma.accountReceivable.updateMany({
      where: { orderId: event.orderId, deletedAt: null },
      data: { status: PaymentStatus.CANCELLED, deletedAt: new Date() },
    });

    // Cancelar ProductionOrders pendentes
    const poCount = await this.prisma.productionOrder.updateMany({
      where: {
        orderId: event.orderId,
        status: ProductionOrderStatus.PENDING,
        deletedAt: null,
      },
      data: { status: ProductionOrderStatus.CANCELLED },
    });

    // Cancelar SeparationOrders pendentes
    const soCount = await this.prisma.separationOrder.updateMany({
      where: {
        orderId: event.orderId,
        status: SeparationOrderStatus.PENDING,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    // Encerrar ProcessInstances
    await this.prisma.processInstance.updateMany({
      where: { orderId: event.orderId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    this.logger.log(
      `Pedido ${order.orderNumber} CANCELADO. ${arCount.count} AR estornado(s), ` +
        `${poCount.count} PO cancelada(s), ${soCount.count} SO cancelada(s).`,
    );
  }
}
