import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { CustomTaskType } from '../types/task.types';

type ListEnvelope = { data: CustomTaskType[]; meta: unknown };
type DetailEnvelope = { data: CustomTaskType; meta: unknown };

export interface CreateCustomTaskTypePayload {
  value: string;
  pluralName?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCustomTaskTypePayload {
  value?: string;
  pluralName?: string | null;
  description?: string | null;
  icon?: string;
  color?: string | null;
}

export const customTaskTypesService = {
  async list(): Promise<CustomTaskType[]> {
    const { data } =
      await api.get<ApiResponse<ListEnvelope>>('/custom-task-types');
    return data.data.data;
  },

  async getById(customTypeId: string): Promise<CustomTaskType> {
    const { data } = await api.get<ApiResponse<DetailEnvelope>>(
      `/custom-task-types/${customTypeId}`,
    );
    return data.data.data;
  },

  async create(
    spaceId: string | null,
    payload: CreateCustomTaskTypePayload,
  ): Promise<CustomTaskType> {
    const url = spaceId
      ? `/spaces/${spaceId}/task-types`
      : '/custom-task-types';
    const { data } = await api.post<ApiResponse<CustomTaskType>>(url, payload);
    return data.data;
  },

  async update(
    spaceId: string | null,
    taskTypeId: string,
    payload: UpdateCustomTaskTypePayload,
  ): Promise<CustomTaskType> {
    const url = spaceId
      ? `/spaces/${spaceId}/task-types/${taskTypeId}`
      : `/custom-task-types/${taskTypeId}`;
    const { data } = await api.put<ApiResponse<CustomTaskType>>(url, payload);
    return data.data;
  },

  async remove(spaceId: string | null, taskTypeId: string): Promise<void> {
    const url = spaceId
      ? `/spaces/${spaceId}/task-types/${taskTypeId}`
      : `/custom-task-types/${taskTypeId}`;
    await api.delete(url);
  },
};
