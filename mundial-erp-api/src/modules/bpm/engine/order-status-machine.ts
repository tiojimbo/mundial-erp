import { Injectable, BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  ProductionOrderStatus,
  SeparationOrderStatus,
  OrderItemSupplyStatus,
} from '@prisma/client';

/** Subset mínimo do Order necessário para validação de guards. */
export interface OrderForTransition {
  status: OrderStatus;
  clientId: string | null;
  totalCents: number;
  paidAmountCents: number;
  paymentProofUrl: string | null;
  items: OrderItemForTransition[];
}

export interface OrderItemForTransition {
  unitPriceCents: number;
}

/** Context passed alongside a transition request. */
export interface TransitionContext {
  reason?: string;
  bankReconciled?: boolean;
  deliveryChecked?: boolean;
  productionOrders?: Array<{ status: ProductionOrderStatus }>;
  separationOrders?: Array<{ status: SeparationOrderStatus }>;
  orderItemSupplies?: Array<{ status: OrderItemSupplyStatus }>;
}

/**
 * Máquina de estados para o ciclo de vida do pedido.
 *
 * Implementa o fluxo:
 *   EM_ORCAMENTO → FATURAR → FATURADO → PRODUZIR → EM_PRODUCAO → PRODUZIDO → ENTREGUE
 *
 * Com cancelamento possível apenas até FATURADO:
 *   EM_ORCAMENTO / FATURAR / FATURADO → CANCELADO (motivo obrigatório)
 */
@Injectable()
export class OrderStatusMachine {
  /**
   * Map of allowed transitions: from → to[]
   */
  private readonly TRANSITIONS: ReadonlyMap<
    OrderStatus,
    readonly OrderStatus[]
  > = new Map<OrderStatus, readonly OrderStatus[]>([
    [OrderStatus.EM_ORCAMENTO, [OrderStatus.FATURAR, OrderStatus.CANCELADO]],
    [OrderStatus.FATURAR, [OrderStatus.FATURADO, OrderStatus.CANCELADO]],
    [OrderStatus.FATURADO, [OrderStatus.PRODUZIR, OrderStatus.CANCELADO]],
    [OrderStatus.PRODUZIR, [OrderStatus.EM_PRODUCAO]],
    [OrderStatus.EM_PRODUCAO, [OrderStatus.PRODUZIDO]],
    [OrderStatus.PRODUZIDO, [OrderStatus.ENTREGUE]],
    // ENTREGUE and CANCELADO are terminal states — no outgoing transitions
  ]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Retorna a lista de status para os quais o pedido pode avançar
   * a partir do status atual.
   */
  getAvailableTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return [...(this.TRANSITIONS.get(currentStatus) ?? [])];
  }

  /**
   * Valida se a transição é permitida e se todas as guardas (guards)
   * de negócio estão satisfeitas. Lança BadRequestException caso
   * qualquer regra seja violada.
   *
   * @param order     - Pedido (parcial) com os campos necessários para validação
   * @param newStatus - Status destino desejado
   * @param context   - Dados adicionais (motivo de cancelamento, flags, entidades relacionadas)
   */
  validateTransition(
    order: OrderForTransition,
    newStatus: OrderStatus,
    context: TransitionContext = {},
  ): void {
    const currentStatus = order.status;

    // 1. Verificar se a transição é estruturalmente permitida
    const allowed = this.TRANSITIONS.get(currentStatus);

    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de status não permitida: ${currentStatus} → ${newStatus}. ` +
          `Transições válidas a partir de "${currentStatus}": ${
            allowed?.length ? allowed.join(', ') : 'nenhuma (status terminal)'
          }.`,
      );
    }

    // 2. Executar a guarda específica da transição
    if (newStatus === OrderStatus.CANCELADO) {
      this.guardCancelamento(currentStatus, context);
      return;
    }

    switch (`${currentStatus}→${newStatus}`) {
      case `${OrderStatus.EM_ORCAMENTO}→${OrderStatus.FATURAR}`:
        this.guardEmOrcamentoParaFaturar(order);
        break;

      case `${OrderStatus.FATURAR}→${OrderStatus.FATURADO}`:
        this.guardFaturarParaFaturado(context);
        break;

      case `${OrderStatus.FATURADO}→${OrderStatus.PRODUZIR}`:
        this.guardFaturadoParaProduzir(context);
        break;

      case `${OrderStatus.PRODUZIR}→${OrderStatus.EM_PRODUCAO}`:
        // Coordenador inicia produção — sem restrições adicionais
        break;

      case `${OrderStatus.EM_PRODUCAO}→${OrderStatus.PRODUZIDO}`:
        this.guardEmProducaoParaProduzido(context);
        break;

      case `${OrderStatus.PRODUZIDO}→${OrderStatus.ENTREGUE}`:
        this.guardProduzidoParaEntregue(order, context);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Guards (guardas de transição)
  // ---------------------------------------------------------------------------

  /**
   * EM_ORCAMENTO → FATURAR
   *
   * - Cliente válido (clientId preenchido)
   * - Pelo menos 1 item no pedido
   * - Todos os preços preenchidos (unitPriceCents > 0)
   * - Pagamento mínimo de 50% (paidAmountCents >= 50% do totalCents)
   * - Comprovante de pagamento anexado (paymentProofUrl)
   */
  private guardEmOrcamentoParaFaturar(order: OrderForTransition): void {
    const errors: string[] = [];

    if (!order.clientId) {
      errors.push('Cliente não informado no pedido.');
    }

    if (order.items.length === 0) {
      errors.push('O pedido deve conter pelo menos 1 item.');
    }

    const itemsSemPreco = order.items.filter(
      (item) => !item.unitPriceCents || item.unitPriceCents <= 0,
    );
    if (itemsSemPreco.length > 0) {
      errors.push(
        `${itemsSemPreco.length} item(ns) sem preço unitário preenchido.`,
      );
    }

    if (order.totalCents <= 0) {
      errors.push('O valor total do pedido deve ser maior que zero.');
    } else {
      const minimumPayment = Math.ceil(order.totalCents * 0.5);
      if (order.paidAmountCents < minimumPayment) {
        const paidPct = (
          (order.paidAmountCents / order.totalCents) *
          100
        ).toFixed(1);
        errors.push(
          `Pagamento insuficiente: recebido ${paidPct}% do total (mínimo exigido: 50%).`,
        );
      }
    }

    if (!order.paymentProofUrl) {
      errors.push('Comprovante de pagamento não anexado (paymentProofUrl).');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Não é possível avançar para FATURAR. Pendências:\n• ${errors.join('\n• ')}`,
      );
    }
  }

  /**
   * FATURAR → FATURADO
   *
   * - Conciliação bancária confirmada
   */
  private guardFaturarParaFaturado(context: TransitionContext): void {
    if (!context.bankReconciled) {
      throw new BadRequestException(
        'Não é possível avançar para FATURADO. A conciliação bancária ainda não foi confirmada.',
      );
    }
  }

  /**
   * FATURADO → PRODUZIR
   *
   * - Pedido com faturamento conciliado
   */
  private guardFaturadoParaProduzir(context: TransitionContext): void {
    if (!context.bankReconciled) {
      throw new BadRequestException(
        'Não é possível avançar para PRODUZIR. O faturamento ainda não foi conciliado.',
      );
    }
  }

  /**
   * EM_PRODUCAO → PRODUZIDO
   *
   * - Todas as ProductionOrders com status COMPLETED
   * - Todos os SeparationOrders com status CHECKED (se existirem)
   * - Todos os OrderItemSupplies com status READY
   */
  private guardEmProducaoParaProduzido(context: TransitionContext): void {
    const errors: string[] = [];

    // Production orders
    const productionOrders = context.productionOrders ?? [];
    if (productionOrders.length === 0) {
      errors.push('Nenhuma ordem de produção encontrada para o pedido.');
    } else {
      const incompletas = productionOrders.filter(
        (po) => po.status !== ProductionOrderStatus.COMPLETED,
      );
      if (incompletas.length > 0) {
        errors.push(
          `${incompletas.length} ordem(ns) de produção ainda não concluída(s). Todas devem estar com status COMPLETED.`,
        );
      }
    }

    // Separation orders (apenas se existirem)
    const separationOrders = context.separationOrders ?? [];
    if (separationOrders.length > 0) {
      const naoConferidas = separationOrders.filter(
        (so) => so.status !== SeparationOrderStatus.CHECKED,
      );
      if (naoConferidas.length > 0) {
        errors.push(
          `${naoConferidas.length} ordem(ns) de separação sem conferência (status deve ser CHECKED).`,
        );
      }
    }

    // Supplies
    const supplies = context.orderItemSupplies ?? [];
    if (supplies.length > 0) {
      const naoProntos = supplies.filter(
        (s) => s.status !== OrderItemSupplyStatus.READY,
      );
      if (naoProntos.length > 0) {
        errors.push(
          `${naoProntos.length} insumo(s) ainda não prontos. Todos devem estar com status READY.`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Não é possível avançar para PRODUZIDO. Pendências:\n• ${errors.join('\n• ')}`,
      );
    }
  }

  /**
   * PRODUZIDO → ENTREGUE
   *
   * - Conferência de entrega OK
   * - Pagamento restante quitado (paidAmountCents >= totalCents)
   */
  private guardProduzidoParaEntregue(
    order: OrderForTransition,
    context: TransitionContext,
  ): void {
    const errors: string[] = [];

    if (!context.deliveryChecked) {
      errors.push('Conferência de entrega não realizada.');
    }

    if (order.totalCents > 0 && order.paidAmountCents < order.totalCents) {
      const remaining = order.totalCents - order.paidAmountCents;
      errors.push(
        `Pagamento pendente: faltam ${(remaining / 100).toFixed(2)} para quitar o pedido (pago: ${(order.paidAmountCents / 100).toFixed(2)} / total: ${(order.totalCents / 100).toFixed(2)}).`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Não é possível avançar para ENTREGUE. Pendências:\n• ${errors.join('\n• ')}`,
      );
    }
  }

  /**
   * * → CANCELADO
   *
   * - Permitido apenas a partir de: EM_ORCAMENTO, FATURAR, FATURADO
   * - Motivo (reason) obrigatório
   *
   * Nota: A verificação de que o status atual permite cancelamento já
   * é feita pela TRANSITIONS map (PRODUZIR, EM_PRODUCAO, PRODUZIDO e
   * ENTREGUE não possuem CANCELADO como transição válida).
   */
  private guardCancelamento(
    currentStatus: OrderStatus,
    context: TransitionContext,
  ): void {
    if (!context.reason || context.reason.trim().length === 0) {
      throw new BadRequestException(
        `Não é possível cancelar o pedido (status atual: ${currentStatus}). ` +
          'O motivo do cancelamento é obrigatório.',
      );
    }
  }
}
