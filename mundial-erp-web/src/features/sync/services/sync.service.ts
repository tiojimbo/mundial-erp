import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  SyncLog,
  SyncJobResponse,
  SyncHealthStatus,
  SyncJobDetail,
  SyncLogFilters,
} from '../types/sync.types';

export const syncService = {
  async getStatus(): Promise<SyncHealthStatus> {
    const { data } = await api.get<SyncHealthStatus>('/sync/status');
    return data;
  },

  async getLogs(filters?: SyncLogFilters): Promise<PaginatedResponse<SyncLog>> {
    const { data } = await api.get<PaginatedResponse<SyncLog>>('/sync/logs', {
      params: filters,
    });
    return data;
  },

  async getJob(jobId: string): Promise<SyncJobDetail> {
    const { data } = await api.get<SyncJobDetail>(`/sync/jobs/${jobId}`);
    return data;
  },

  async syncClients(): Promise<SyncJobResponse> {
    const { data } = await api.post<SyncJobResponse>('/sync/clients');
    return data;
  },

  async syncOrders(): Promise<SyncJobResponse> {
    const { data } = await api.post<SyncJobResponse>('/sync/orders');
    return data;
  },

  async syncReferenceData(): Promise<SyncJobResponse> {
    const { data } = await api.post<SyncJobResponse>('/sync/reference-data');
    return data;
  },

  async syncAll(): Promise<SyncJobResponse> {
    const { data } = await api.post<SyncJobResponse>('/sync/all');
    return data;
  },
};
