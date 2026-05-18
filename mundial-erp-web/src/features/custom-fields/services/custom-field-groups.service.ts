import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { CustomFieldGroupEmbed } from '../types/custom-field.types';

export interface CreateCustomFieldGroupPayload {
  name: string;
  color?: string;
  position?: number;
}

export type UpdateCustomFieldGroupPayload = Partial<CreateCustomFieldGroupPayload>;

export const customFieldGroupsService = {
  async list(): Promise<CustomFieldGroupEmbed[]> {
    const { data } = await api.get<ApiResponse<CustomFieldGroupEmbed[]>>(
      '/custom-fields/groups',
    );
    return data.data;
  },

  async listByTaskType(taskTypeId: string): Promise<CustomFieldGroupEmbed[]> {
    const { data } = await api.get<ApiResponse<CustomFieldGroupEmbed[]>>(
      `/custom-fields/groups/task-type/${taskTypeId}`,
    );
    return data.data;
  },

  async listByList(listId: string): Promise<CustomFieldGroupEmbed[]> {
    const { data } = await api.get<ApiResponse<CustomFieldGroupEmbed[]>>(
      `/custom-fields/groups/list/${listId}`,
    );
    return data.data;
  },

  async create(
    payload: CreateCustomFieldGroupPayload,
  ): Promise<CustomFieldGroupEmbed> {
    const { data } = await api.post<ApiResponse<CustomFieldGroupEmbed>>(
      '/custom-fields/groups',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateCustomFieldGroupPayload,
  ): Promise<CustomFieldGroupEmbed> {
    const { data } = await api.put<ApiResponse<CustomFieldGroupEmbed>>(
      `/custom-fields/groups/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<CustomFieldGroupEmbed> {
    const { data } = await api.delete<ApiResponse<CustomFieldGroupEmbed>>(
      `/custom-fields/groups/${id}`,
    );
    return data.data;
  },
};
