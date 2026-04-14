import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderStatus,
  ProductClassification,
  ProductionOrderStatus,
  SeparationOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Listener: Status → PRODUZIR
 *
 * Split automatico conforme PLANO 3.2:
 * - Cria ProductionOrder com itens FABRICACAO_PROPRIA
 * - Cria SeparationOrder com itens REVENDA/INSUMO (se houver)
 */
@Injectable()
export class OrderProduzirListener {
  private readonly logger = new Logger(OrderProduzirListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed')
  async handle(event: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    userId: string;
  }) {
    if (event.toStatus !== OrderStatus.PRODUZIR) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: {
        items: {
          where: { deletedAt: null },
          include: { product: true },
        },
      },
    });

    if (!order) return;

    // Verificar duplicidade
    const existingPO = await this.prisma.productionOrder.findFirst({
      where: { orderId: event.orderId, deletedAt: null },
    });
    if (existingPO) {
      this.logger.warn(`ProductionOrder ja existe para pedido ${order.orderNumber}. Ignorando.`);
      return;
    }

    // Split: separar itens por classificacao
    const fabricacaoItems = order.items.filter(
      (item) => item.classificationSnapshot === ProductClassification.FABRICACAO_PROPRIA,
    );
    const revendaItems = order.items.filter(
      (item) =>
        item.classificationSnapshot === ProductClassification.REVENDA ||
        item.classificationSnapshot === ProductClassification.INSUMO,
    );

    // Criar ProductionOrder para itens FABRICACAO_PROPRIA
    if (fabricacaoItems.length > 0) {
      const poCode = `OP-${order.orderNumber}`;
      await this.prisma.productionOrder.create({
        data: {
          order: { connect: { id: event.orderId } },
          code: poCode,
          status: ProductionOrderStatus.PENDING,
          scheduledDate: order.deliveryDeadline,
          items: {
            create: fabricacaoItems
              .filter((item) => item.productId !== null)
              .map((item) => ({
                orderItem: { connect: { id: item.id } },
                product: { connect: { id: item.productId! } },
                quantity: item.quantity,
                pieces: item.pieces,
                size: item.size,
              })),
          },
        },
      });

      this.logger.log(
        `ProductionOrder ${poCode} criada com ${fabricacaoItems.length} item(ns)`,
      );
    }

    // Criar SeparationOrder para itens REVENDA/INSUMO
    if (revendaItems.length > 0) {
      const soCode = `OS-${order.orderNumber}`;
      await this.prisma.separationOrder.create({
        data: {
          order: { connect: { id: event.orderId } },
          code: soCode,
          status: SeparationOrderStatus.PENDING,
          scheduledDate: order.deliveryDeadline,
          items: {
            create: revendaItems
              .filter((item) => item.productId !== null)
              .map((item) => ({
                orderItem: { connect: { id: item.id } },
                product: { connect: { id: item.productId! } },
                quantity: item.quantity,
              })),
          },
        },
      });

      this.logger.log(
        `SeparationOrder ${soCode} criada com ${revendaItems.length} item(ns)`,
      );
    }
  }
}
