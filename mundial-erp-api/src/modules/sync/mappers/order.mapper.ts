import { OrderStatus } from '@prisma/client';
import { PfOrder, PfOrderItem } from '../pro-financas/dto/pro-financas.types';

export interface OrderMappedData {
  orderNumber: string;
  title: string | null;
  status: OrderStatus;
  clientId: string;
  companyId: string | null;
  paymentMethodId: string | null;
  carrierId: string | null;
  orderTypeId: string | null;
  orderFlowId: string | null;
  orderModelId: string | null;
  issueDate: Date | null;
  deliveryDeadline: Date | null;
  subtotalCents: number;
  freightCents: number;
  discountCents: number;
  taxSubstitutionCents: number;
  totalCents: number;
  paidAmountCents: number;
  notes: string | null;
}

export interface OrderItemMappedData {
  productName: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  sortOrder: number;
}

export class OrderMapper {
  /**
   * PLANO 5.5: orderNumber = PF's original código (string).
   * PLANO 5.6: status mapped from PF boolean flags.
   */
  static toMappedData(
    pf: PfOrder,
    resolvedIds: {
      clientId: string;
      companyId: string | null;
      paymentMethodId: string | null;
      carrierId: string | null;
      orderTypeId: string | null;
      orderFlowId: string | null;
      orderModelId: string | null;
    },
  ): OrderMappedData {
    return {
      orderNumber: String(pf.codigo),
      title: pf.titulo || null,
      status: OrderMapper.mapStatus(pf),
      clientId: resolvedIds.clientId,
      companyId: resolvedIds.companyId,
      paymentMethodId: resolvedIds.paymentMethodId,
      carrierId: resolvedIds.carrierId,
      orderTypeId: resolvedIds.orderTypeId,
      orderFlowId: resolvedIds.orderFlowId,
      orderModelId: resolvedIds.orderModelId,
      issueDate: pf.dt_emissao_tt ? new Date(pf.dt_emissao_tt) : null,
      deliveryDeadline: pf.dt_entrega_tt ? new Date(pf.dt_entrega_tt) : null,
      subtotalCents: OrderMapper.toCents(pf.valor_venda),
      freightCents: OrderMapper.toCents(pf.valor_frete),
      discountCents: OrderMapper.toCents(pf.valor_desconto),
      taxSubstitutionCents: OrderMapper.toCents(pf.valor_st),
      totalCents: OrderMapper.toCents(pf.valor_total),
      paidAmountCents: OrderMapper.toCents(pf.valor_pago),
      notes: pf.observacao || null,
    };
  }

  /**
   * PLANO 5.7: OrderItems migrated without productId.
   * productName = xprod from PF. productId = null.
   */
  static mapItem(pf: PfOrderItem, index: number): OrderItemMappedData {
    const quantity = pf.qcom ? parseFloat(pf.qcom) : 0;
    const unitPriceCents = OrderMapper.toCents(pf.vuncom);
    const discountCents = OrderMapper.toCents(pf.vundesc);
    const totalCents = pf.vtotal
      ? OrderMapper.toCents(pf.vtotal)
      : Math.round(quantity * unitPriceCents - discountCents);

    return {
      productName: pf.xprod || null,
      quantity,
      unitPriceCents,
      discountCents,
      totalCents,
      sortOrder: pf.ordem ?? index,
    };
  }

  /**
   * PLANO 5.6: Status mapping from PF boolean flags.
   */
  static mapStatus(pf: PfOrder): OrderStatus {
    if (pf.pedido_fluxo_id === 1) return OrderStatus.EM_ORCAMENTO;
    if (pf.pedido_fluxo_id === 3) return OrderStatus.CANCELADO;
    if (pf.finalizado && pf.entregue) return OrderStatus.ENTREGUE;
    if (pf.liberado && pf.pago && !pf.entregue) return OrderStatus.FATURADO;
    if (pf.liberado && !pf.pago) return OrderStatus.FATURAR;
    return OrderStatus.EM_ORCAMENTO; // default seguro
  }

  static checksumFields(pf: PfOrder): Record<string, unknown> {
    return {
      codigo: pf.codigo,
      titulo: pf.titulo,
      cliente_id: pf.cliente_id,
      empresa_id: pf.empresa_id,
      valor_total: pf.valor_total,
      finalizado: pf.finalizado,
      pago: pf.pago,
      entregue: pf.entregue,
      liberado: pf.liberado,
      pedido_fluxo_id: pf.pedido_fluxo_id,
      updated_at: pf.updated_at,
    };
  }

  private static toCents(value?: number): number {
    if (value === undefined || value === null) return 0;
    return Math.round(value * 100);
  }
}
