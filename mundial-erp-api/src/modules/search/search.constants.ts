export const ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT';

// Index names
export const ES_INDEX_CLIENTS = 'mundial_clients';
export const ES_INDEX_PRODUCTS = 'mundial_products';
export const ES_INDEX_ORDERS = 'mundial_orders';
export const ES_INDEX_INVOICES = 'mundial_invoices';
export const ES_INDEX_SUPPLIERS = 'mundial_suppliers';

export const ALL_INDICES = [
  ES_INDEX_CLIENTS,
  ES_INDEX_PRODUCTS,
  ES_INDEX_ORDERS,
  ES_INDEX_INVOICES,
  ES_INDEX_SUPPLIERS,
] as const;

export type SearchEntityType =
  | 'clients'
  | 'products'
  | 'orders'
  | 'invoices'
  | 'suppliers';

export const ENTITY_INDEX_MAP: Record<SearchEntityType, string> = {
  clients: ES_INDEX_CLIENTS,
  products: ES_INDEX_PRODUCTS,
  orders: ES_INDEX_ORDERS,
  invoices: ES_INDEX_INVOICES,
  suppliers: ES_INDEX_SUPPLIERS,
};

// Mapping: only fields we need to search on (text) + keyword sub-fields for exact match
export const INDEX_MAPPINGS: Record<string, Record<string, unknown>> = {
  [ES_INDEX_CLIENTS]: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      tradeName: { type: 'text', analyzer: 'standard' },
      cpfCnpj: { type: 'keyword' },
      email: { type: 'keyword' },
      phone: { type: 'keyword' },
      city: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      state: { type: 'keyword' },
      deletedAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  [ES_INDEX_PRODUCTS]: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      code: { type: 'keyword' },
      barcode: { type: 'keyword' },
      status: { type: 'keyword' },
      deletedAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  [ES_INDEX_ORDERS]: {
    properties: {
      orderNumber: { type: 'keyword' },
      title: { type: 'text', analyzer: 'standard' },
      clientName: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      status: { type: 'keyword' },
      deletedAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  [ES_INDEX_INVOICES]: {
    properties: {
      invoiceNumber: { type: 'keyword' },
      accessKey: { type: 'keyword' },
      clientName: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      direction: { type: 'keyword' },
      deletedAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  [ES_INDEX_SUPPLIERS]: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      tradeName: { type: 'text', analyzer: 'standard' },
      cpfCnpj: { type: 'keyword' },
      email: { type: 'keyword' },
      state: { type: 'keyword' },
      deletedAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
};

// Circuit breaker settings
export const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
export const CIRCUIT_BREAKER_RESET_MS = 30_000; // 30s before half-open
