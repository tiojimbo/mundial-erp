// ===== Shared Production & Separation Enums =====
// Single source of truth — imported by both features/orders and features/production

export const PRODUCTION_ORDER_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];

export const PO_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Producao',
  COMPLETED: 'Concluida',
  CANCELLED: 'Cancelada',
};

export const PO_STATUS_STEPS: ProductionOrderStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
];

export const SEPARATION_ORDER_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'SEPARATED',
  'CHECKED',
] as const;

export type SeparationOrderStatus = (typeof SEPARATION_ORDER_STATUSES)[number];

export const SO_STATUS_LABELS: Record<SeparationOrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  SEPARATED: 'Separado',
  CHECKED: 'Conferido',
};
