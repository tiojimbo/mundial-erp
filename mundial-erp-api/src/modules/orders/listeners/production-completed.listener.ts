import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → PRODUZIDO (PLANO 3.4)
 *
 * Efeitos:
 * - Baixa estoque de insumos (consumptions) — STUB, requer Squad Estoque
 * - Entrada de produto acabado (outputs) — STUB, requer Squad Estoque
 * - Notifica conferencia/entrega
 *
 * TODO: Integrar com modulo de Estoque quando Squad Estoque implementar.
 */
@Injectable()
export class ProductionCompletedListener {
  private readonly logger = new Logger(ProductionCompletedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.PRODUZIDO) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: {
        productionOrders: {
          where: { deletedAt: null },
          include: {
            consumptions: true,
            outputs: true,
          },
        },
      },
    });

    if (!order) return;

    // STUB: Baixa de insumos e entrada de produto acabado
    // Sera implementado quando Squad Estoque entregar o modulo de movimentacao.
    // Por enquanto, apenas loga a intencao.

    for (const po of order.productionOrders) {
      this.logger.log(
        `[STUB] PO ${po.code}: ${po.consumptions.length} consumption(s) para baixa, ` +
          `${po.outputs.length} output(s) para entrada`,
      );
    }

    this.logger.log(
      `Pedido ${order.orderNumber} PRODUZIDO. Movimentacao de estoque pendente (stub).`,
    );
  }
}
