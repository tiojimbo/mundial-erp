import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  ProcessConfig,
  CreateProcessPayload,
  UpdateProcessPayload,
  ActivityConfig,
  CreateActivityPayload,
  UpdateActivityPayload,
} from '../types/settings.types';

export const processesService = {
  async getAll(): Promise<ProcessConfig[]> {
    const { data } = await api.get<ProcessConfig[]>('/processes');
    return data;
  },

  async getById(id: string): Promise<ProcessConfig> {
    const { data: envelope } = await api.get<ApiResponse<ProcessConfig>>(
      `/processes/${id}`,
    );
    return envelope.data;
  },

  async create(payload: CreateProcessPayload): Promise<ProcessConfig> {
    const { data } = await api.post<ProcessConfig>('/processes', payload);
    return data;
  },

  async update(id: string, payload: UpdateProcessPayload): Promise<ProcessConfig> {
    const { data } = await api.patch<ProcessConfig>(`/processes/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/processes/${id}`);
  },

  async createActivity(payload: CreateActivityPayload): Promise<ActivityConfig> {
    const { data } = await api.post<ActivityConfig>('/activities', payload);
    return data;
  },

  async updateActivity(id: string, payload: UpdateActivityPayload): Promise<ActivityConfig> {
    const { data } = await api.patch<ActivityConfig>(`/activities/${id}`, payload);
    return data;
  },

  async removeActivity(id: string): Promise<void> {
    await api.delete(`/activities/${id}`);
  },
};
