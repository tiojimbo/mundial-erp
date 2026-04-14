export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

export type SyncEntity =
  | 'CLIENT'
  | 'ORDER'
  | 'COMPANY'
  | 'CARRIER'
  | 'PAYMENT_METHOD'
  | 'CLIENT_CLASSIFICATION'
  | 'DELIVERY_ROUTE'
  | 'ORDER_TYPE'
  | 'ORDER_FLOW'
  | 'ORDER_MODEL';

export type SyncLog = {
  id: string;
  entity: SyncEntity;
  status: SyncStatus;
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type SyncJobResponse = {
  jobId: string;
  entity: SyncEntity | 'ALL';
  status: SyncStatus;
  message: string;
};

export type SyncHealthStatus = {
  connected: boolean;
  lastSync: string | null;
  queueSize: number;
  activeJobs: number;
  entities: SyncEntityStatus[];
};

export type SyncEntityStatus = {
  entity: SyncEntity;
  lastSyncAt: string | null;
  lastStatus: SyncStatus | null;
  totalMapped: number;
};

export type SyncJobDetail = {
  jobId: string;
  entity: SyncEntity | 'ALL';
  status: SyncStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type SyncLogFilters = {
  page?: number;
  limit?: number;
  entity?: SyncEntity;
  status?: SyncStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export const SYNC_ENTITY_LABELS: Record<SyncEntity, string> = {
  CLIENT: 'Clientes',
  ORDER: 'Pedidos',
  COMPANY: 'Empresas',
  CARRIER: 'Transportadoras',
  PAYMENT_METHOD: 'Formas de Pagamento',
  CLIENT_CLASSIFICATION: 'Classificações',
  DELIVERY_ROUTE: 'Rotas de Entrega',
  ORDER_TYPE: 'Tipos de Pedido',
  ORDER_FLOW: 'Fluxos de Pedido',
  ORDER_MODEL: 'Modelos de Pedido',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  SUCCESS: 'Sucesso',
  FAILED: 'Falhou',
};
