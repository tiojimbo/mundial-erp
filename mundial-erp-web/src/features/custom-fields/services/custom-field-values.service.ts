import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  CustomFieldRawValue,
  CustomFieldValue,
} from '../types/custom-field.types';

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
    const { data } = await api.put<ApiResponse<CustomFieldValue>>(
      `/tasks/${taskId}/custom-fields/${definitionId}`,
      { value },
    );
    return data.data;
  },
};
