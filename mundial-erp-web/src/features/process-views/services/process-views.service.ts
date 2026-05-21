import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  CreateProcessViewPayload,
  ProcessView,
} from '../types/process-view.types';

export const processViewsService = {
  async list(processId: string): Promise<ProcessView[]> {
    const { data } = await api.get<PaginatedResponse<ProcessView>>(
      '/views',
      { params: { listId: processId, limit: 100 } },
    );
    return data.data;
  },

  async create(payload: CreateProcessViewPayload): Promise<ProcessView> {
    const { data } = await api.post<ApiResponse<ProcessView>>(
      '/views',
      payload,
    );
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/views/${id}`);
  },
};
