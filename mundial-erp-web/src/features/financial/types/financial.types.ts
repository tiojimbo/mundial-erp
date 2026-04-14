// ===== Enums =====

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type InvoiceDirection = 'INBOUND' | 'OUTBOUND';

export type FinancialCategoryType = 'RECEITA' | 'DESPESA';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

export const INVOICE_DIRECTION_LABELS: Record<InvoiceDirection, string> = {
  INBOUND: 'Entrada',
  OUTBOUND: 'Saída',
};

// ===== Entities =====

export type FinancialCategory = {
  id: string;
  name: string;
  type: FinancialCategoryType;
  parentId: string | null;
};

export type AccountReceivable = {
  id: string;
  orderId: string | null;
  clientId: string;
  client?: { id: string; name: string; cpfCnpj: string };
  order?: { id: string; orderNumber: string };
  description: string;
  amountCents: number;
  paidAmountCents: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountPayable = {
  id: string;
  supplierId: string | null;
  supplier?: { id: string; name: string; cpfCnpj: string };
  description: string;
  amountCents: number;
  paidAmountCents: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  categoryId: string | null;
  category?: FinancialCategory;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  direction: InvoiceDirection;
  orderId: string | null;
  order?: { id: string; orderNumber: string };
  clientId: string | null;
  client?: { id: string; name: string; cpfCnpj: string };
  companyId: string | null;
  company?: { id: string; tradeName: string };
  totalCents: number;
  issuedAt: string;
  cancelledAt: string | null;
  xmlContent: string | null;
  pdfUrl: string | null;
  accessKey: string | null;
  proFinancasId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CashRegister = {
  id: string;
  companyId: string;
  company?: { id: string; tradeName: string };
  openedByUserId: string;
  openedByUser?: { id: string; name: string };
  closedByUserId: string | null;
  closedByUser?: { id: string; name: string };
  openedAt: string;
  closedAt: string | null;
  openingBalanceCents: number;
  closingBalanceCents: number | null;
  proFinancasId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialSummary = {
  receivable: {
    totalCents: number;
    paidCents: number;
    pendingCents: number;
    overdueCents: number;
    overdueCount: number;
  };
  payable: {
    totalCents: number;
    paidCents: number;
    pendingCents: number;
    overdueCents: number;
    overdueCount: number;
  };
  cashBalance: {
    currentCents: number;
    isOpen: boolean;
  };
  invoices: {
    issuedCount: number;
    cancelledCount: number;
    totalIssuedCents: number;
  };
};

// ===== Payloads =====

export type RegisterPaymentPayload = {
  paidAmountCents: number;
  paidDate?: string;
};

export type CreateAccountReceivablePayload = {
  orderId?: string;
  clientId: string;
  description: string;
  amountCents: number;
  dueDate: string;
  invoiceId?: string;
};

export type CreateAccountPayablePayload = {
  supplierId?: string;
  description: string;
  amountCents: number;
  dueDate: string;
  categoryId?: string;
};

export type OpenCashRegisterPayload = {
  companyId: string;
  openingBalanceCents: number;
};

export type CloseCashRegisterPayload = {
  closingBalanceCents: number;
};

// ===== Filters =====

export type ARFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatus;
  clientId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type APFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatus;
  supplierId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type InvoiceFilters = {
  page?: number;
  limit?: number;
  search?: string;
  direction?: InvoiceDirection;
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CashRegisterFilters = {
  page?: number;
  limit?: number;
  isOpen?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
