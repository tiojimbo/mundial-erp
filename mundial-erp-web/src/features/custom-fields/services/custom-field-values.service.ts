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
    customFieldId: string,
    value: CustomFieldRawValue,
  ): Promise<CustomFieldValue> {
    const { data } = await api.put<ApiResponse<CustomFieldValue>>(
      `/custom-fields/task/${taskId}/field/${customFieldId}`,
      { value },
    );
    return data.data;
  },

  async clearValue(
    taskId: string,
    customFieldId: string,
  ): Promise<{ message: string }> {
    const { data } = await api.delete<ApiResponse<{ message: string }>>(
      `/custom-fields/task/${taskId}/field/${customFieldId}`,
    );
    return data.data;
  },

  async setValuesBulk(
    taskId: string,
    values: { definitionId: string; value: CustomFieldRawValue }[],
  ): Promise<{
    updated: CustomFieldValue[];
    failed: { definitionId: string; reason: string }[];
  }> {
    const { data } = await api.put<
      ApiResponse<{
        updated: CustomFieldValue[];
        failed: { definitionId: string; reason: string }[];
      }>
    >(`/custom-fields/task/${taskId}/fields`, { values });
    return data.data;
  },
};
