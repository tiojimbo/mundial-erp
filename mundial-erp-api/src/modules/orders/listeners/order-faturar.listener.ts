import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → FATURAR
 *
 * Cria AccountReceivable com 2 parcelas:
 * - 50% PAID (entrada ja recebida)
 * - 50% PENDING (para entrega)
 */
@Injectable()
export class OrderFaturarListener {
  private readonly logger = new Logger(OrderFaturarListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.FATURAR) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { client: true },
    });

    if (!order) return;

    // Verificar se AR ja existe para evitar duplicidade
    const existingAR = await this.prisma.accountReceivable.findFirst({
      where: { orderId: event.orderId, deletedAt: null },
    });
    if (existingAR) {
      this.logger.warn(
        `AR ja existe para pedido ${order.orderNumber}. Ignorando criacao duplicada.`,
      );
      return;
    }

    const halfTotal = Math.ceil(order.totalCents / 2);
    const remainingHalf = order.totalCents - halfTotal;

    // Parcela 1: 50% entrada (PAID)
    await this.prisma.accountReceivable.create({
      data: {
        order: { connect: { id: event.orderId } },
        client: { connect: { id: order.clientId } },
        description: `Pedido ${order.orderNumber} - Parcela 1/2 (Entrada 50%)`,
        amountCents: halfTotal,
        paidAmountCents: halfTotal,
        dueDate: new Date(),
        paidDate: new Date(),
        status: PaymentStatus.PAID,
      },
    });

    // Parcela 2: 50% restante (PENDING)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await this.prisma.accountReceivable.create({
      data: {
        order: { connect: { id: event.orderId } },
        client: { connect: { id: order.clientId } },
        description: `Pedido ${order.orderNumber} - Parcela 2/2 (Entrega 50%)`,
        amountCents: remainingHalf,
        paidAmountCents: 0,
        dueDate,
        status: PaymentStatus.PENDING,
      },
    });

    this.logger.log(
      `AR criado para pedido ${order.orderNumber}: 2 parcelas (${halfTotal}c PAID + ${remainingHalf}c PENDING)`,
    );
  }
}
