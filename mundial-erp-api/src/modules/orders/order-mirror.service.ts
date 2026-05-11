import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, StatusCategory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const MIRROR_WORKSPACE_SLUG = 'teste';
const MIRROR_INITIAL_LIST_SLUG = 'teste-pedidos';
const MIRROR_TASK_TYPE_ID = 'builtin-order';

@Injectable()
export class OrderMirrorService {
  private readonly logger = new Logger(OrderMirrorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMirror(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        workspace: { select: { slug: true } },
        client: { select: { name: true } },
      },
    });

    if (!order || !order.workspace) {
      return;
    }

    if (order.workspace.slug !== MIRROR_WORKSPACE_SLUG) {
      return;
    }

    if (order.workItemId) {
      return;
    }

    const initialList = await this.prisma.list.findUnique({
      where: { slug: MIRROR_INITIAL_LIST_SLUG },
      select: { id: true, spaceId: true },
    });
    if (!initialList || !initialList.spaceId) {
      this.logger.warn(
        `List inicial "${MIRROR_INITIAL_LIST_SLUG}" nao encontrada. Espelho de ${orderId} ignorado.`,
      );
      return;
    }

    const statusId = await this.findStatusId(
      initialList.spaceId,
      order.status,
    );
    if (!statusId) {
      this.logger.warn(
        `WorkflowStatus para OrderStatus ${order.status} nao encontrado no space ${initialList.spaceId}. Espelho de ${orderId} ignorado.`,
      );
      return;
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        listId: initialList.id,
        statusId,
        title: `${order.orderNumber} — ${order.client.name}`,
        creatorId: order.createdByUserId,
        customTypeId: MIRROR_TASK_TYPE_ID,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { workItemId: workItem.id },
    });

    this.logger.log(
      `Espelho WorkItem ${workItem.id} criado para Order ${order.orderNumber}`,
    );
  }

  async updateStatusMirror(
    orderId: string,
    toStatus: OrderStatus,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { workItemId: true },
    });
    if (!order?.workItemId) return;

    const wi = await this.prisma.workItem.findUnique({
      where: { id: order.workItemId },
      select: { list: { select: { spaceId: true } } },
    });
    if (!wi?.list?.spaceId) return;

    const statusId = await this.findStatusId(wi.list.spaceId, toStatus);
    if (!statusId) return;

    await this.prisma.workItem.update({
      where: { id: order.workItemId },
      data: { statusId },
    });

    this.logger.log(
      `Espelho WorkItem ${order.workItemId} -> statusId ${statusId} (Order ${orderId} -> ${toStatus})`,
    );
  }

  async softDeleteMirror(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { workItemId: true },
    });
    if (!order?.workItemId) return;

    await this.prisma.workItem.update({
      where: { id: order.workItemId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(
      `Espelho WorkItem ${order.workItemId} soft-deletado (Order ${orderId})`,
    );
  }

  private async findStatusId(
    spaceId: string,
    orderStatus: OrderStatus,
  ): Promise<string | null> {
    const category = this.mapStatusCategory(orderStatus);
    const status = await this.prisma.workflowStatus.findFirst({
      where: { spaceId, category, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    return status?.id ?? null;
  }

  private mapStatusCategory(orderStatus: OrderStatus): StatusCategory {
    switch (orderStatus) {
      case OrderStatus.EM_ORCAMENTO:
      case OrderStatus.FATURAR:
        return StatusCategory.NOT_STARTED;
      case OrderStatus.FATURADO:
      case OrderStatus.PRODUZIR:
      case OrderStatus.EM_PRODUCAO:
      case OrderStatus.PRODUZIDO:
        return StatusCategory.ACTIVE;
      case OrderStatus.ENTREGUE:
      case OrderStatus.CANCELADO:
        return StatusCategory.DONE;
    }
  }
}
