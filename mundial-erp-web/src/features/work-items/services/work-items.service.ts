import { api } from '@/lib/api';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type {
  WorkItem,
  GroupedWorkItemsResponse,
  CreateWorkItemPayload,
  UpdateWorkItemPayload,
  WorkItemFilters,
} from '../types/work-item.types';

export const workItemsService = {
  async list(filters?: WorkItemFilters): Promise<PaginatedResponse<WorkItem>> {
    const params: Record<string, unknown> = {};
    if (filters?.processId) params.processId = filters.processId;
    if (filters?.statusId) params.statusId = filters.statusId;
    if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.search) params.search = filters.search;
    if (filters?.showClosed !== undefined) params.showClosed = filters.showClosed;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    const { data } = await api.get<PaginatedResponse<WorkItem>>('/work-items', {
      params,
    });
    return data;
  },

  async grouped(
    processId: string,
    groupBy?: string,
  ): Promise<GroupedWorkItemsResponse> {
    const params: Record<string, unknown> = { processId };
    if (groupBy) params.groupBy = groupBy;
    const { data } = await api.get<ApiResponse<GroupedWorkItemsResponse>>(
      '/work-items/grouped',
      { params },
    );
    return data.data;
  },

  async getById(id: string): Promise<WorkItem> {
    const { data } = await api.get<ApiResponse<WorkItem>>(`/work-items/${id}`);
    return data.data;
  },

  async create(payload: CreateWorkItemPayload): Promise<WorkItem> {
    const { data } = await api.post<ApiResponse<WorkItem>>(
      '/work-items',
      payload,
    );
    return data.data;
  },

  async update(id: string, payload: UpdateWorkItemPayload): Promise<WorkItem> {
    const { data } = await api.patch<ApiResponse<WorkItem>>(
      `/work-items/${id}`,
      payload,
    );
    return data.data;
  },

  async updateStatus(id: string, statusId: string): Promise<WorkItem> {
    const { data } = await api.patch<ApiResponse<WorkItem>>(
      `/work-items/${id}/status`,
      { statusId },
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/work-items/${id}`);
  },
};
