import { api } from '@/lib/api';
import type {
  DepartmentConfig,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  CreateAreaPayload,
  UpdateAreaPayload,
  AreaConfig,
} from '../types/settings.types';

export const departmentsService = {
  async getAll(): Promise<DepartmentConfig[]> {
    const { data } = await api.get<DepartmentConfig[]>('/departments');
    return data;
  },

  async getById(id: string): Promise<DepartmentConfig> {
    const { data } = await api.get<DepartmentConfig>(`/departments/${id}`);
    return data;
  },

  async create(payload: CreateDepartmentPayload): Promise<DepartmentConfig> {
    const { data } = await api.post<DepartmentConfig>('/departments', payload);
    return data;
  },

  async update(id: string, payload: UpdateDepartmentPayload): Promise<DepartmentConfig> {
    const { data } = await api.patch<DepartmentConfig>(`/departments/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/departments/${id}`);
  },

  async createArea(payload: CreateAreaPayload): Promise<AreaConfig> {
    const { data } = await api.post<AreaConfig>('/areas', payload);
    return data;
  },

  async updateArea(id: string, payload: UpdateAreaPayload): Promise<AreaConfig> {
    const { data } = await api.patch<AreaConfig>(`/areas/${id}`, payload);
    return data;
  },

  async removeArea(id: string): Promise<void> {
    await api.delete(`/areas/${id}`);
  },
};
