// ===== Report Types =====

export type ReportPeriod = {
  from: string;
  to: string;
};

// ===== DRE (Demonstrativo de Resultados do Exercício) =====

export type DRELineItem = {
  label: string;
  valueCents: number;
  percentage: number;
  children?: DRELineItem[];
};

export type DREReport = {
  period: ReportPeriod;
  lines: DRELineItem[];
  totalRevenueCents: number;
  totalExpensesCents: number;
  netResultCents: number;
};

// ===== Sales Report =====

export type SalesReportItem = {
  date: string;
  ordersCount: number;
  totalCents: number;
  avgTicketCents: number;
  topProduct?: string;
};

export type SalesSummary = {
  totalOrdersCount: number;
  totalCents: number;
  avgTicketCents: number;
  growthPercentage: number;
};

export type SalesReport = {
  period: ReportPeriod;
  summary: SalesSummary;
  daily: SalesReportItem[];
  byProduct: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalCents: number;
  }>;
  byClient: Array<{
    clientId: string;
    clientName: string;
    ordersCount: number;
    totalCents: number;
  }>;
};

// ===== Cash Flow Report =====

export type CashFlowEntry = {
  date: string;
  inflowCents: number;
  outflowCents: number;
  balanceCents: number;
};

export type CashFlowReport = {
  period: ReportPeriod;
  openingBalanceCents: number;
  closingBalanceCents: number;
  totalInflowCents: number;
  totalOutflowCents: number;
  netFlowCents: number;
  entries: CashFlowEntry[];
};

// ===== Filters =====

export type ReportFilters = {
  from?: string;
  to?: string;
  departmentId?: string;
};
