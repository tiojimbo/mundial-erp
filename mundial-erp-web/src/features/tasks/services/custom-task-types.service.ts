import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { CustomTaskType } from '../types/task.types';

type ListEnvelope = { data: CustomTaskType[]; meta: unknown };
type DetailEnvelope = { data: CustomTaskType; meta: unknown };

export interface CreateCustomTaskTypePayload {
  name: string;
  namePlural?: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Service para `/api/v1/custom-task-types` (PLANO-TASKS.md §7.3).
 *
 * Nota: o service do backend ja monta `{ data, meta }` e o `ResponseInterceptor`
 * global envelopa novamente — por isso precisamos desempacotar dois niveis
 * (`data.data.data`). Ate o backend remover o envelope duplo, manter este
 * unwrap aqui.
 */
export const customTaskTypesService = {
  async list(): Promise<CustomTaskType[]> {
    const { data } = await api.get<ApiResponse<ListEnvelope>>(
      '/custom-task-types',
    );
    return data.data.data;
  },

  async getById(customTypeId: string): Promise<CustomTaskType> {
    const { data } = await api.get<ApiResponse<DetailEnvelope>>(
      `/custom-task-types/${customTypeId}`,
    );
    return data.data.data;
  },

  async create(payload: CreateCustomTaskTypePayload): Promise<CustomTaskType> {
    const { data } = await api.post<ApiResponse<CustomTaskType>>(
      '/custom-task-types',
      payload,
    );
    return data.data;
  },
};
