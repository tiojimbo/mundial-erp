import { api } from '@/lib/api';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type {
  Client,
  CreateClientPayload,
  UpdateClientPayload,
  ClientFilters,
  ClientClassification,
  DeliveryRoute,
  ClientOrderSummary,
  ClientFinancialSummary,
} from '../types/client.types';

export const clientService = {
  async getAll(filters?: ClientFilters): Promise<PaginatedResponse<Client>> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;
    const { data } = await api.get<PaginatedResponse<Client>>('/clients', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Client> {
    const { data } = await api.get<ApiResponse<Client>>(`/clients/${id}`);
    return data.data;
  },

  async create(payload: CreateClientPayload): Promise<Client> {
    const { data } = await api.post<ApiResponse<Client>>('/clients', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateClientPayload): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async getOrders(id: string): Promise<ClientOrderSummary[]> {
    const { data } = await api.get<ApiResponse<ClientOrderSummary[]>>(
      `/clients/${id}/orders`,
    );
    return data.data;
  },

  async getFinancials(id: string): Promise<ClientFinancialSummary> {
    const { data } = await api.get<ApiResponse<ClientFinancialSummary>>(
      `/clients/${id}/financials`,
    );
    return data.data;
  },

  async getClassifications(): Promise<ClientClassification[]> {
    const { data } = await api.get<PaginatedResponse<ClientClassification>>(
      '/client-classifications',
      { params: { limit: 100 } },
    );
    return data.data;
  },

  async getDeliveryRoutes(): Promise<DeliveryRoute[]> {
    const { data } = await api.get<PaginatedResponse<DeliveryRoute>>(
      '/delivery-routes',
      { params: { limit: 100 } },
    );
    return data.data;
  },
};
