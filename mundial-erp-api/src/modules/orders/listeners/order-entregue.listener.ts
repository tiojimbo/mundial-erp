import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → ENTREGUE
 *
 * - Registra 2a parcela AR como PAID
 * - Encerra ProcessInstances vinculadas
 */
@Injectable()
export class OrderEntregueListener {
  private readonly logger = new Logger(OrderEntregueListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.ENTREGUE) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) return;

    // Registrar 2a parcela como PAID
    const arParcela2 = await this.prisma.accountReceivable.findFirst({
      where: {
        orderId: event.orderId,
        status: PaymentStatus.PENDING,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (arParcela2) {
      await this.prisma.accountReceivable.update({
        where: { id: arParcela2.id },
        data: {
          status: PaymentStatus.PAID,
          paidAmountCents: arParcela2.amountCents,
          paidDate: new Date(),
        },
      });
      this.logger.log(
        `Parcela 2 do pedido ${order.orderNumber} marcada como PAID (${arParcela2.amountCents}c)`,
      );
    }

    // Encerrar ProcessInstances vinculadas
    await this.prisma.processInstance.updateMany({
      where: {
        orderId: event.orderId,
        status: 'ACTIVE',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Pedido ${order.orderNumber} ENTREGUE. AR quitado e ProcessInstances encerradas.`,
    );
  }
}
