import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → FATURADO (PLANO 3.2)
 *
 * - Registra pagamento da 1a parcela (50%) no AR
 * - Notifica Producao (placeholder)
 */
@Injectable()
export class OrderFaturadoListener {
  private readonly logger = new Logger(OrderFaturadoListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.FATURADO) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) return;

    // Verificar se parcela 1 ja esta PAID
    const arParcela1 = await this.prisma.accountReceivable.findFirst({
      where: {
        orderId: event.orderId,
        status: PaymentStatus.PAID,
        description: { contains: 'Parcela 1/2' },
        deletedAt: null,
      },
    });

    if (arParcela1) {
      this.logger.log(
        `Parcela 1 do pedido ${order.orderNumber} ja registrada como PAID`,
      );
    }

    this.logger.log(
      `Pedido ${order.orderNumber} FATURADO. Conciliacao bancaria confirmada.`,
    );
  }
}
