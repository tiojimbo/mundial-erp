import { api } from '@/lib/api';
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
    const { data } = await api.get<ProcessConfig[]>('/lists');
    return data;
  },

  async getById(id: string): Promise<ProcessConfig> {
    const { data } = await api.get<ProcessConfig>(`/lists/${id}`);
    return data;
  },

  async create(payload: CreateProcessPayload): Promise<ProcessConfig> {
    const { data } = await api.post<ProcessConfig>('/lists', payload);
    return data;
  },

  async update(id: string, payload: UpdateProcessPayload): Promise<ProcessConfig> {
    const { data } = await api.put<ProcessConfig>(`/lists/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/lists/${id}`);
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
