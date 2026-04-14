import type { Order, OrderStatus } from '../types/order.types';

export type StatusTransition = {
  label: string;
  icon: string;
  from: OrderStatus[];
  to: OrderStatus;
  variant: 'primary' | 'neutral' | 'error';
  requiresConfirmation?: boolean;
  /** Roles allowed to perform this transition. Empty = all roles */
  allowedRoles?: string[];
  /** Departments allowed. Empty = all departments */
  allowedDepartments?: string[];
  guard?: (order: Order) => string | null;
};

export const TRANSITIONS: StatusTransition[] = [
  {
    label: 'Enviar para Faturamento',
    icon: 'ri-send-plane-line',
    from: ['EM_ORCAMENTO'],
    to: 'FATURAR',
    variant: 'primary',
    requiresConfirmation: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
    allowedDepartments: ['COMERCIAL', 'ADMINISTRACAO'],
    guard: (order) => {
      if (!order.items || order.items.length === 0) {
        return 'Pedido deve ter ao menos 1 item';
      }
      const hasItemWithoutPrice = order.items.some((i) => i.unitPriceCents <= 0);
      if (hasItemWithoutPrice) {
        return 'Todos os itens devem ter preco preenchido';
      }
      const halfTotal = Math.floor(order.totalCents / 2);
      if (order.paidAmountCents < halfTotal) {
        return 'Pagamento de 50% e obrigatorio';
      }
      if (!order.paymentProofUrl) {
        return 'Comprovante de pagamento e obrigatorio';
      }
      return null;
    },
  },
  {
    label: 'Conciliar Pagamento',
    icon: 'ri-bank-line',
    from: ['FATURAR'],
    to: 'FATURADO',
    variant: 'primary',
    requiresConfirmation: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
    allowedDepartments: ['FINANCEIRO', 'ADMINISTRACAO'],
  },
  {
    label: 'Iniciar Producao',
    icon: 'ri-hammer-line',
    from: ['PRODUZIR'],
    to: 'EM_PRODUCAO',
    variant: 'primary',
    allowedRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
    allowedDepartments: ['PRODUCAO', 'ADMINISTRACAO'],
  },
  {
    label: 'Finalizar Producao',
    icon: 'ri-checkbox-circle-line',
    from: ['EM_PRODUCAO'],
    to: 'PRODUZIDO',
    variant: 'primary',
    requiresConfirmation: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
    allowedDepartments: ['PRODUCAO', 'ADMINISTRACAO'],
    guard: (order) => {
      const allPOsCompleted = order.productionOrders?.every(
        (po) => po.status === 'COMPLETED',
      );
      if (!allPOsCompleted) return 'Todas as ordens de producao devem estar concluidas';

      const allSuppliesReady = order.items?.every((item) =>
        item.supplies.length === 0 || item.supplies.every((s) => s.status === 'READY'),
      );
      if (!allSuppliesReady) return 'Todos os insumos devem estar marcados como prontos';

      const hasSO = order.separationOrders && order.separationOrders.length > 0;
      if (hasSO) {
        const allSOChecked = order.separationOrders.every(
          (so) => so.status === 'CHECKED',
        );
        if (!allSOChecked) return 'Ordens de separacao devem estar conferidas';
      }
      return null;
    },
  },
  {
    label: 'Entregar',
    icon: 'ri-truck-line',
    from: ['PRODUZIDO'],
    to: 'ENTREGUE',
    variant: 'primary',
    requiresConfirmation: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
    guard: (order) => {
      if (order.paidAmountCents < order.totalCents) {
        return 'Pagamento total (100%) e obrigatorio para entrega';
      }
      return null;
    },
  },
  {
    label: 'Cancelar Pedido',
    icon: 'ri-close-circle-line',
    from: ['EM_ORCAMENTO', 'FATURAR', 'FATURADO'],
    to: 'CANCELADO',
    variant: 'error',
    requiresConfirmation: true,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
];

export const STATUS_FLOW: OrderStatus[] = [
  'EM_ORCAMENTO',
  'FATURAR',
  'FATURADO',
  'PRODUZIR',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'ENTREGUE',
];

export function getAvailableTransitions(
  order: Order,
  userRole?: string,
  userDepartment?: string,
): StatusTransition[] {
  return TRANSITIONS.filter((t) => {
    if (!t.from.includes(order.status)) return false;
    if (t.allowedRoles && t.allowedRoles.length > 0 && userRole) {
      if (!t.allowedRoles.includes(userRole)) return false;
    }
    if (t.allowedDepartments && t.allowedDepartments.length > 0 && userDepartment) {
      if (!t.allowedDepartments.includes(userDepartment)) return false;
    }
    return true;
  });
}

export function isStatusAfter(current: OrderStatus, targets: OrderStatus[]): boolean {
  const currentIdx = STATUS_FLOW.indexOf(current);
  return targets.some((t) => currentIdx >= STATUS_FLOW.indexOf(t));
}
