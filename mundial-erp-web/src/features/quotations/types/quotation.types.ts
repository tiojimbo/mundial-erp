// ===== Enums =====

export const QUOTATION_STATUSES = [
  'DRAFT',
  'SENT',
  'RECEIVED',
  'SELECTED',
  'REJECTED',
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  RECEIVED: 'Recebida',
  SELECTED: 'Selecionada',
  REJECTED: 'Rejeitada',
};

export const PURCHASE_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'RECEIVED',
  'CANCELLED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

// ===== Entities =====

export type PurchaseQuotationItem = {
  id: string;
  quotationId: string;
  productId: string;
  product?: { id: string; name: string; code: string };
  quantity: number;
  unitPriceCents: number;
};

export type PurchaseQuotation = {
  id: string;
  supplierId: string;
  supplier?: { id: string; name: string; cpfCnpj: string };
  status: QuotationStatus;
  requestedAt: string;
  receivedAt: string | null;
  totalCents: number;
  notes: string | null;
  items: PurchaseQuotationItem[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseQuotationSummary = {
  id: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  status: QuotationStatus;
  requestedAt: string;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  quotationId: string | null;
  supplier?: { id: string; name: string };
  status: PurchaseOrderStatus;
  totalCents: number;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
};

export type QuotationTimelineEvent = {
  id: string;
  type: 'status_change' | 'proposal_received' | 'selected' | 'order_created';
  description: string;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

// ===== Payloads =====

export type CreateQuotationItemPayload = {
  productId: string;
  quantity: number;
};

export type CreateQuotationPayload = {
  supplierId: string;
  notes?: string;
  items: CreateQuotationItemPayload[];
};

export type UpdateQuotationPayload = {
  status?: QuotationStatus;
  receivedAt?: string;
  totalCents?: number;
  notes?: string;
  items?: {
    productId: string;
    quantity: number;
    unitPriceCents: number;
  }[];
};

export type CreatePurchaseOrderPayload = {
  quotationId: string;
  supplierId: string;
  totalCents: number;
  expectedDeliveryDate?: string;
  notes?: string;
};

export type QuotationFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: QuotationStatus | QuotationStatus[];
  supplierId?: string;
};
