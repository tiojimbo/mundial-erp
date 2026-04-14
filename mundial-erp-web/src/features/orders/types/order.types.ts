// ===== Enums =====

export const ORDER_STATUSES = [
  'EM_ORCAMENTO',
  'FATURAR',
  'FATURADO',
  'PRODUZIR',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'ENTREGUE',
  'CANCELADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  EM_ORCAMENTO: 'Em Orcamento',
  FATURAR: 'Faturar',
  FATURADO: 'Faturado',
  PRODUZIR: 'Produzir',
  EM_PRODUCAO: 'Em Producao',
  PRODUZIDO: 'Produzido',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

/** Ordered steps for the stepper (excludes CANCELADO) */
export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'EM_ORCAMENTO',
  'FATURAR',
  'FATURADO',
  'PRODUZIR',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'ENTREGUE',
];

export type OrderItemSupplyStatus = 'PENDING' | 'READY';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// Import + re-export from shared — single source of truth
import type { ProductionOrderStatus, SeparationOrderStatus } from '@/types/production.types';
export type { ProductionOrderStatus, SeparationOrderStatus };

// ===== Entities =====

export type OrderItemSupply = {
  id: string;
  orderItemId: string;
  productId: string | null;
  name: string;
  quantity: number;
  status: OrderItemSupplyStatus;
  readyAt: string | null;
  checkedByUserId: string | null;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    code: string;
    classificationSnapshot?: string;
  };
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  sortOrder: number;
  pieces: number | null;
  size: number | null;
  classificationSnapshot: string | null;
  supplies: OrderItemSupply[];
};

export type OrderStatusHistory = {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedByUserId: string;
  changedByUser?: { id: string; name: string };
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AccountReceivable = {
  id: string;
  orderId: string | null;
  clientId: string;
  description: string;
  amountCents: number;
  paidAmountCents: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  invoiceId: string | null;
};

export type ProductionOrderItem = {
  id: string;
  productionOrderId: string;
  orderItemId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  quantity: number;
  pieces: number | null;
  size: number | null;
};

export type ProductionConsumption = {
  id: string;
  productionOrderId: string;
  ingredientId: string;
  ingredient?: { id: string; name: string; code: string };
  plannedQuantity: number;
  actualQuantity: number | null;
  costCents: number;
  totalCostCents: number;
};

export type ProductionOrder = {
  id: string;
  orderId: string;
  code: string;
  status: ProductionOrderStatus;
  type: string;
  scheduledDate: string | null;
  completedDate: string | null;
  assignedUserId: string | null;
  notes: string | null;
  items: ProductionOrderItem[];
  consumptions: ProductionConsumption[];
};

export type SeparationOrderItem = {
  id: string;
  separationOrderId: string;
  orderItemId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  quantity: number;
  pieces: number | null;
  stockLocation: string | null;
  isSeparated: boolean;
  isChecked: boolean;
};

export type SeparationOrder = {
  id: string;
  orderId: string;
  code: string;
  status: SeparationOrderStatus;
  assignedUserId: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  items: SeparationOrderItem[];
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  orderId: string | null;
  totalCents: number;
  issuedAt: string;
  cancelledAt: string | null;
  pdfUrl: string | null;
  accessKey: string | null;
  status?: string;
};

export type ProcessInstance = {
  id: string;
  processId: string;
  process?: { id: string; name: string; slug: string };
  orderId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  activityInstances: ActivityInstance[];
};

export type ActivityInstance = {
  id: string;
  activityId: string;
  activity?: {
    id: string;
    name: string;
    slug: string;
    ownerRole: string;
    slaMinutes: number | null;
  };
  processInstanceId: string;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string };
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  notes: string | null;
  taskInstances: TaskInstance[];
};

export type TaskInstance = {
  id: string;
  taskId: string;
  task?: { id: string; description: string; isMandatory: boolean };
  activityInstanceId: string;
  status: 'PENDING' | 'DONE';
  completedByUserId: string | null;
};

// ===== Order (main entity) =====

export type Order = {
  id: string;
  orderNumber: string;
  title: string | null;
  status: OrderStatus;
  clientId: string;
  client?: {
    id: string;
    name: string;
    cpfCnpj: string;
    phone: string | null;
    email: string | null;
  };
  companyId: string | null;
  paymentMethodId: string | null;
  paymentMethod?: { id: string; name: string };
  carrierId: string | null;
  carrier?: { id: string; name: string };
  priceTableId: string | null;
  createdByUserId: string;
  createdByUser?: { id: string; name: string };
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string };
  issueDate: string | null;
  deliveryDeadline: string | null;
  proposalValidityDays: number;
  deliveryAddress: string | null;
  deliveryNeighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryCep: string | null;
  deliveryReferencePoint: string | null;
  contactName: string | null;
  subtotalCents: number;
  freightCents: number;
  discountCents: number;
  taxSubstitutionCents: number;
  totalCents: number;
  paidAmountCents: number;
  paymentProofUrl: string | null;
  shouldProduce: boolean;
  isResale: boolean;
  hasTaxSubstitution: boolean;
  notes: string | null;
  proFinancasId: number | null;
  orderTypeId: string | null;
  orderFlowId: string | null;
  orderModelId: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  processInstances: ProcessInstance[];
  accountsReceivable: AccountReceivable[];
  productionOrders: ProductionOrder[];
  separationOrders: SeparationOrder[];
  invoices: Invoice[];
  createdAt: string;
  updatedAt: string;
};

// ===== List summary type =====

export type OrderSummary = {
  id: string;
  orderNumber: string;
  title: string | null;
  status: OrderStatus;
  client?: { id: string; name: string };
  totalCents: number;
  paidAmountCents: number;
  createdByUser?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

// ===== Timeline =====

export type TimelineEvent = {
  id: string;
  type: 'status_change' | 'activity_completed' | 'handoff' | 'note' | 'payment' | 'supply_ready';
  description: string;
  userId: string | null;
  userName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

// ===== Payloads =====

export type CreateOrderItemPayload = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  pieces?: number;
  size?: number;
  supplies?: { productId?: string; name: string; quantity?: number }[];
};

export type CreateOrderPayload = {
  clientId: string;
  title?: string;
  paymentMethodId?: string;
  carrierId?: string;
  priceTableId?: string;
  deliveryDeadline?: string;
  proposalValidityDays?: number;
  deliveryAddress?: string;
  deliveryNeighborhood?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryCep?: string;
  deliveryReferencePoint?: string;
  contactName?: string;
  freightCents?: number;
  discountCents?: number;
  shouldProduce?: boolean;
  isResale?: boolean;
  hasTaxSubstitution?: boolean;
  notes?: string;
  items: CreateOrderItemPayload[];
};

export type UpdateOrderPayload = Partial<Omit<CreateOrderPayload, 'items'>> & {
  items?: CreateOrderItemPayload[];
};

export type ChangeStatusPayload = {
  reason?: string;
};

export type RegisterPaymentPayload = {
  paidAmountCents: number;
  paymentProofUrl?: string;
};

export type OrderFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus | OrderStatus[];
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
