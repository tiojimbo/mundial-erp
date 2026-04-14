// Re-export shared enums — single source of truth
export {
  PRODUCTION_ORDER_STATUSES,
  type ProductionOrderStatus,
  PO_STATUS_LABELS,
  PO_STATUS_STEPS,
  SEPARATION_ORDER_STATUSES,
  type SeparationOrderStatus,
  SO_STATUS_LABELS,
} from '@/types/production.types';

import type { ProductionOrderStatus, SeparationOrderStatus } from '@/types/production.types';

// ===== Entities (full production API shape) =====

export type ProductionOrderItem = {
  id: string;
  productionOrderId: string;
  orderItemId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  quantity: number;
  pieces: number | null;
  size: number | null;
  unitMeasureId: string | null;
};

export type ProductionConsumption = {
  id: string;
  productionOrderId: string;
  ingredientId: string;
  ingredient?: { id: string; name: string; code: string };
  unitMeasureId: string | null;
  plannedQuantity: number;
  actualQuantity: number | null;
  weightM3: number | null;
  weight: number | null;
  costCents: number;
  totalCostCents: number;
  operation: string;
};

export type ProductionOutput = {
  id: string;
  productionOrderId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  unitMeasureId: string | null;
  quantity: number;
  operation: string;
};

export type ProductionLoss = {
  id: string;
  productionOrderId: string;
  description: string | null;
  quantity: number | null;
  costCents: number | null;
};

export type ProductionOrder = {
  id: string;
  orderId: string;
  order?: {
    id: string;
    orderNumber: string;
    title: string | null;
    client?: { id: string; name: string };
  };
  code: string;
  status: ProductionOrderStatus;
  type: string;
  machineId: string | null;
  batch: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string };
  notes: string | null;
  items: ProductionOrderItem[];
  consumptions: ProductionConsumption[];
  outputs: ProductionOutput[];
  losses: ProductionLoss[];
  createdAt: string;
  updatedAt: string;
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
  order?: {
    id: string;
    orderNumber: string;
    client?: { id: string; name: string };
  };
  code: string;
  status: SeparationOrderStatus;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string };
  scheduledDate: string | null;
  completedDate: string | null;
  items: SeparationOrderItem[];
  createdAt: string;
  updatedAt: string;
};

// ===== Summary types for list views =====

export type ProductionOrderSummary = {
  id: string;
  orderId: string;
  order?: {
    id: string;
    orderNumber: string;
    title: string | null;
    client?: { id: string; name: string };
  };
  code: string;
  status: ProductionOrderStatus;
  type: string;
  scheduledDate: string | null;
  completedDate: string | null;
  assignedUser?: { id: string; name: string };
  itemCount: number;
  createdAt: string;
};

export type SeparationOrderSummary = {
  id: string;
  orderId: string;
  order?: {
    id: string;
    orderNumber: string;
    client?: { id: string; name: string };
  };
  code: string;
  status: SeparationOrderStatus;
  assignedUser?: { id: string; name: string };
  scheduledDate: string | null;
  itemCount: number;
  createdAt: string;
};

// ===== Payloads =====

export type StartProductionPayload = {
  assignedUserId?: string;
  notes?: string;
};

export type CompleteProductionPayload = {
  notes?: string;
};

export type RegisterConsumptionPayload = {
  ingredientId: string;
  unitMeasureId?: string;
  actualQuantity: number;
  weightM3?: number;
  weight?: number;
};

export type RegisterOutputPayload = {
  productId: string;
  unitMeasureId?: string;
  quantity: number;
};

export type RegisterLossPayload = {
  description?: string;
  quantity?: number;
  costCents?: number;
};

// ===== Filters =====

export type ProductionOrderFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductionOrderStatus | ProductionOrderStatus[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type SeparationOrderFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: SeparationOrderStatus | SeparationOrderStatus[];
};
