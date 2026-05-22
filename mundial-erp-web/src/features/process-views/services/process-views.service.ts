import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  CreateProcessViewPayload,
  ProcessView,
  UpdateProcessViewPayload,
} from '../types/process-view.types';

type RawProcessView = Omit<ProcessView, 'processId'> & {
  listId?: string;
  processId?: string;
};

function normalize(raw: RawProcessView): ProcessView {
  return {
    ...raw,
    processId: raw.processId ?? raw.listId ?? '',
  } as ProcessView;
}

export const processViewsService = {
  async list(processId: string): Promise<ProcessView[]> {
    const { data } = await api.get<PaginatedResponse<RawProcessView>>(
      '/views',
      { params: { listId: processId, limit: 100 } },
    );
    return data.data.map(normalize);
  },

  async create(payload: CreateProcessViewPayload): Promise<ProcessView> {
    const { processId, ...rest } = payload;
    const { data } = await api.post<ApiResponse<RawProcessView>>('/views', {
      listId: processId,
      ...rest,
    });
    return normalize(data.data);
  },

  async update(
    id: string,
    payload: UpdateProcessViewPayload,
  ): Promise<ProcessView> {
    const { data } = await api.patch<ApiResponse<RawProcessView>>(
      `/views/${id}`,
      payload,
    );
    return normalize(data.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/views/${id}`);
  },
};
