import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { WorkItemStatus } from '@/features/work-items/types/work-item.types';

export type CreateWorkflowStatusPayload = {
  name: string;
  category: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  color: string;
  icon?: string;
  departmentId: string;
};

export type UpdateWorkflowStatusPayload = {
  name?: string;
  color?: string;
  icon?: string;
};

export type ReorderWorkflowStatusItem = {
  id: string;
  sortOrder: number;
};

export const workflowStatusesService = {
  async getByDepartment(
    departmentId: string,
    areaId?: string,
  ): Promise<WorkItemStatus[]> {
    const { data: envelope } = await api.get<
      ApiResponse<WorkItemStatus[] | Record<string, WorkItemStatus[]>>
    >('/workflow-statuses', {
      params: { departmentId, areaId },
    });
    const payload = envelope.data;
    if (Array.isArray(payload)) return payload;
    return Object.values(payload).flat();
  },

  async create(payload: CreateWorkflowStatusPayload): Promise<WorkItemStatus> {
    const { data: envelope } = await api.post<ApiResponse<WorkItemStatus>>(
      '/workflow-statuses',
      payload,
    );
    return envelope.data;
  },

  async update(id: string, payload: UpdateWorkflowStatusPayload): Promise<WorkItemStatus> {
    const { data: envelope } = await api.patch<ApiResponse<WorkItemStatus>>(
      `/workflow-statuses/${id}`,
      payload,
    );
    return envelope.data;
  },

  async remove(id: string, migrateToStatusId?: string): Promise<void> {
    await api.delete(`/workflow-statuses/${id}`, {
      data: migrateToStatusId ? { migrateToStatusId } : undefined,
    });
  },

  async reorder(items: ReorderWorkflowStatusItem[]): Promise<void> {
    await api.post('/workflow-statuses/reorder', { items });
  },
};
