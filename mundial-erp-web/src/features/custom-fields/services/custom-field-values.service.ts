import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  CustomFieldRawValue,
  CustomFieldValue,
} from '../types/custom-field.types';

/**
 * Service HTTP para `/api/v1/tasks/:taskId/custom-fields[/:definitionId]`.
 *
 * Backend retorna `CustomFieldValueResponseDto[]` (lista) ou
 * `CustomFieldValueResponseDto` (PATCH) — sem `{items,total}`. O
 * `ResponseInterceptor` envelopa em `{ data, meta: { timestamp } }`.
 *
 * O DTO do backend ja embute a `definition` completa em cada valor; o
 * frontend nao precisa de hidratacao adicional.
 */
export const customFieldValuesService = {
  async listForTask(taskId: string): Promise<CustomFieldValue[]> {
    const { data } = await api.get<ApiResponse<CustomFieldValue[]>>(
      `/tasks/${taskId}/custom-fields`,
    );
    return data.data;
  },

  async setValue(
    taskId: string,
    definitionId: string,
    value: CustomFieldRawValue,
  ): Promise<CustomFieldValue> {
    const { data } = await api.patch<ApiResponse<CustomFieldValue>>(
      `/tasks/${taskId}/custom-fields/${definitionId}`,
      { value },
    );
    return data.data;
  },
};
