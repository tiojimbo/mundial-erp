import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  Dashboard,
  DashboardListItem,
  DashboardCard,
  CardDataResponse,
  DashboardFilter,
  DashboardFilters,
  CreateDashboardPayload,
  UpdateDashboardPayload,
  CreateCardPayload,
  UpdateCardPayload,
  BatchLayoutPayload,
  CreateFilterPayload,
} from '../types/dashboard.types';

function idempotencyHeaders() {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

export const dashboardService = {
  // ===== Dashboards =====

  async getAll(filters?: DashboardFilters): Promise<PaginatedResponse<DashboardListItem>> {
    const { data } = await api.get<PaginatedResponse<DashboardListItem>>(
      '/dashboards',
      { params: filters },
    );
    return data;
  },

  async getById(id: string): Promise<Dashboard> {
    const { data } = await api.get<Dashboard>(`/dashboards/${id}`);
    return data;
  },

  async create(payload: CreateDashboardPayload): Promise<Dashboard> {
    const { data } = await api.post<Dashboard>(
      '/dashboards',
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  async update(id: string, payload: UpdateDashboardPayload): Promise<Dashboard> {
    const { data } = await api.patch<Dashboard>(
      `/dashboards/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/dashboards/${id}`);
  },

  // ===== Cards =====

  async addCard(dashboardId: string, payload: CreateCardPayload): Promise<DashboardCard> {
    const { data } = await api.post<DashboardCard>(
      `/dashboards/${dashboardId}/cards`,
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  async updateCard(
    dashboardId: string,
    cardId: string,
    payload: UpdateCardPayload,
  ): Promise<DashboardCard> {
    const { data } = await api.patch<DashboardCard>(
      `/dashboards/${dashboardId}/cards/${cardId}`,
      payload,
    );
    return data;
  },

  async removeCard(dashboardId: string, cardId: string): Promise<void> {
    await api.delete(`/dashboards/${dashboardId}/cards/${cardId}`);
  },

  async updateLayout(dashboardId: string, payload: BatchLayoutPayload): Promise<void> {
    await api.patch(`/dashboards/${dashboardId}/layout`, payload);
  },

  async getCardData(
    dashboardId: string,
    cardId: string,
    globalFilters?: Record<string, unknown>,
  ): Promise<CardDataResponse> {
    const { data } = await api.get<CardDataResponse>(
      `/dashboards/${dashboardId}/cards/${cardId}/data`,
      { params: globalFilters },
    );
    return data;
  },

  // ===== Filters =====

  async addFilter(dashboardId: string, payload: CreateFilterPayload): Promise<DashboardFilter> {
    const { data } = await api.post<DashboardFilter>(
      `/dashboards/${dashboardId}/filters`,
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  async removeFilter(dashboardId: string, filterId: string): Promise<void> {
    await api.delete(`/dashboards/${dashboardId}/filters/${filterId}`);
  },
};
