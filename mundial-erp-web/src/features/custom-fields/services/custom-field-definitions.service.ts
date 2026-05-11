import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  CreateCustomFieldDefinitionPayload,
  CustomFieldDefinition,
  CustomFieldDefinitionsListParams,
  UpdateCustomFieldDefinitionPayload,
} from '../types/custom-field.types';

export const customFieldDefinitionsService = {
  async list(
    params?: CustomFieldDefinitionsListParams,
  ): Promise<PaginatedResponse<CustomFieldDefinition>> {
    const { data } = await api.get<PaginatedResponse<CustomFieldDefinition>>(
      '/custom-fields',
      { params },
    );
    return data;
  },

  async create(
    payload: CreateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.post<ApiResponse<CustomFieldDefinition>>(
      '/custom-fields',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.put<ApiResponse<CustomFieldDefinition>>(
      `/custom-fields/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/custom-fields/${id}`);
  },
};
