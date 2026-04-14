import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

export type LookupItem = {
  id: string;
  name: string;
};

export type ProductLookup = {
  id: string;
  name: string;
  code: string;
  priceCents?: number;
};

export const lookupService = {
  async getClients(): Promise<LookupItem[]> {
    const { data } = await api.get<ApiResponse<LookupItem[]>>('/clients', {
      params: { limit: 100 },
    });
    return data.data ?? [];
  },

  async getPaymentMethods(): Promise<LookupItem[]> {
    const { data } = await api.get<ApiResponse<LookupItem[]>>('/payment-methods', {
      params: { limit: 100 },
    });
    return data.data ?? [];
  },

  async getCarriers(): Promise<LookupItem[]> {
    const { data } = await api.get<ApiResponse<LookupItem[]>>('/carriers', {
      params: { limit: 100 },
    });
    return data.data ?? [];
  },

  async getPriceTables(): Promise<LookupItem[]> {
    const { data } = await api.get<ApiResponse<LookupItem[]>>('/price-tables', {
      params: { limit: 100 },
    });
    return data.data ?? [];
  },

  async getProducts(): Promise<ProductLookup[]> {
    const { data } = await api.get<ApiResponse<ProductLookup[]>>('/products', {
      params: { limit: 100 },
    });
    return data.data ?? [];
  },
};
