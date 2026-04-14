// ===== Enums =====

export type CardType =
  | 'KPI_NUMBER'
  | 'BAR_CHART'
  | 'LINE_CHART'
  | 'PIE_CHART'
  | 'DONUT'
  | 'AREA_CHART'
  | 'STACKED_BAR'
  | 'TABLE';

export type FilterOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER'
  | 'LESS'
  | 'BETWEEN'
  | 'IN';

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  KPI_NUMBER: 'Número KPI',
  BAR_CHART: 'Gráfico de Barras',
  LINE_CHART: 'Gráfico de Linhas',
  PIE_CHART: 'Gráfico de Pizza',
  DONUT: 'Gráfico Donut',
  AREA_CHART: 'Gráfico de Área',
  STACKED_BAR: 'Barras Empilhadas',
  TABLE: 'Tabela',
};

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  EQUALS: 'Igual a',
  NOT_EQUALS: 'Diferente de',
  GREATER: 'Maior que',
  LESS: 'Menor que',
  BETWEEN: 'Entre',
  IN: 'Contém',
};

// ===== Entities =====

export type DataSource = {
  entity: string;
  processId?: string;
  departmentId?: string;
  statusFilter?: string;
  dateRange?: { from: string; to: string };
};

export type AxisConfig = {
  xField: string;
  yField: string;
  groupBy?: string;
};

export type DashboardCard = {
  id: string;
  dashboardId: string;
  type: CardType;
  title: string;
  dataSource: DataSource;
  filters: Record<string, unknown>;
  axisConfig: AxisConfig | null;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  config: Record<string, unknown>;
  sortOrder: number;
};

export type DashboardFilter = {
  id: string;
  dashboardId: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  label: string;
};

export type Dashboard = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner?: { id: string; name: string };
  isPublic: boolean;
  autoRefreshSeconds: number | null;
  sortOrder: number;
  cards: DashboardCard[];
  filters: DashboardFilter[];
  createdAt: string;
  updatedAt: string;
};

export type DashboardListItem = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner?: { id: string; name: string };
  isPublic: boolean;
  cardCount: number;
  updatedAt: string;
};

// ===== Card Data (response from /cards/:cardId/data) =====

export type CardDataPoint = {
  label: string;
  value: number;
  x?: string | number;
  y?: number;
  group?: string;
};

export type CardDataResponse = {
  points: CardDataPoint[];
  total?: number;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
};

// ===== Payloads =====

export type CreateDashboardPayload = {
  name: string;
  description?: string;
  isPublic?: boolean;
};

export type UpdateDashboardPayload = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  autoRefreshSeconds?: number | null;
};

export type CreateCardPayload = {
  type: CardType;
  title: string;
  dataSource: DataSource;
  filters?: Record<string, unknown>;
  axisConfig?: AxisConfig;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  config?: Record<string, unknown>;
};

export type UpdateCardPayload = Partial<CreateCardPayload>;

export type BatchLayoutPayload = {
  cards: Array<{
    id: string;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
  }>;
};

export type CreateFilterPayload = {
  field: string;
  operator: FilterOperator;
  value: unknown;
  label: string;
};

// ===== Filters =====

export type DashboardFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

// ===== Data Source Entities (available for card configuration) =====

export const DATA_SOURCE_ENTITIES = [
  { value: 'orders', label: 'Pedidos' },
  { value: 'accounts-receivable', label: 'Contas a Receber' },
  { value: 'accounts-payable', label: 'Contas a Pagar' },
  { value: 'products', label: 'Produtos' },
  { value: 'production-orders', label: 'Ordens de Produção' },
  { value: 'clients', label: 'Clientes' },
  { value: 'suppliers', label: 'Fornecedores' },
  { value: 'invoices', label: 'Notas Fiscais' },
] as const;
