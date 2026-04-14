// ===== Enums =====

export const REQUISITION_TYPES = ['VENDA', 'INTERNO'] as const;

export type RequisitionType = (typeof REQUISITION_TYPES)[number];

export const REQUISITION_TYPE_LABELS: Record<RequisitionType, string> = {
  VENDA: 'Venda',
  INTERNO: 'Interno',
};

export const REQUISITION_STATUSES = [
  'PENDING',
  'APPROVED',
  'PROCESSED',
  'CANCELLED',
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  PROCESSED: 'Processada',
  CANCELLED: 'Cancelada',
};

// ===== Entities (match backend StockRequisitionResponseDto — flat fields) =====

export type StockRequisitionItem = {
  id: string;
  productId: string;
  productCode?: string;
  productName?: string;
  productEan?: string;
  requestedQuantity: number;
  unitType: string;
  unitsPerBox?: number;
  quantityInBaseUnit: number;
  actualQuantity?: number;
  processed: boolean;
};

export type StockRequisition = {
  id: string;
  code: string;
  type: RequisitionType;
  status: RequisitionStatus;
  requestedByUserId: string;
  requestedByName?: string;
  approvedByUserId?: string;
  approvedByName?: string;
  orderId?: string;
  orderNumber?: string;
  notes?: string;
  requestedAt: string;
  processedAt?: string;
  createdAt: string;
  items: StockRequisitionItem[];
};

export type StockRequisitionSummary = {
  id: string;
  code: string;
  type: RequisitionType;
  status: RequisitionStatus;
  requestedByUserId: string;
  requestedByName?: string;
  orderId?: string;
  notes?: string;
  requestedAt: string;
  processedAt?: string;
  createdAt: string;
  _count?: { items: number };
};

// ===== Payloads =====

export type CreateRequisitionItemPayload = {
  productId: string;
  requestedQuantity: number;
  unitType: 'UN' | 'CX';
  unitsPerBox?: number;
};

export type CreateRequisitionPayload = {
  type: RequisitionType;
  orderId?: string;
  notes?: string;
  items: CreateRequisitionItemPayload[];
};

export type ProcessItemPayload = {
  unitType: 'UN' | 'CX';
  actualQuantity: number;
};

// ===== Filters =====

export type RequisitionFilters = {
  page?: number;
  limit?: number;
  type?: RequisitionType;
  status?: RequisitionStatus | RequisitionStatus[];
};
