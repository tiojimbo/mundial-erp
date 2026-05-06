import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  CreateCustomFieldDefinitionPayload,
  CustomFieldDefinition,
  CustomFieldDefinitionsListParams,
  UpdateCustomFieldDefinitionPayload,
} from '../types/custom-field.types';

/**
 * Service HTTP para `/api/v1/custom-field-definitions` (PLANO M1).
 *
 * Backend retorna `{ items, total }` no controller, e o `ResponseInterceptor`
 * global envelopa em `{ data, meta: { pagination } }` (apenas um nivel —
 * diferente de `custom-task-types`, este modulo NAO faz double-wrap).
 *
 * Mutacoes (`create`/`update`/`remove`) sao gateadas por role ADMIN/MANAGER
 * no backend e tipicamente consumidas pelas telas de Settings (sprint futura).
 */
export const customFieldDefinitionsService = {
  async list(
    params?: CustomFieldDefinitionsListParams,
  ): Promise<PaginatedResponse<CustomFieldDefinition>> {
    const { data } = await api.get<PaginatedResponse<CustomFieldDefinition>>(
      '/custom-field-definitions',
      { params },
    );
    return data;
  },

  async create(
    payload: CreateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.post<ApiResponse<CustomFieldDefinition>>(
      '/custom-field-definitions',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.patch<ApiResponse<CustomFieldDefinition>>(
      `/custom-field-definitions/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/custom-field-definitions/${id}`);
  },
};
