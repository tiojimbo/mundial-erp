import { api } from '@/lib/api';
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
  async getByDepartment(departmentId: string): Promise<WorkItemStatus[]> {
    const { data } = await api.get<WorkItemStatus[]>('/workflow-statuses', {
      params: { departmentId },
    });
    return data;
  },

  async create(payload: CreateWorkflowStatusPayload): Promise<WorkItemStatus> {
    const { data } = await api.post<WorkItemStatus>('/workflow-statuses', payload);
    return data;
  },

  async update(id: string, payload: UpdateWorkflowStatusPayload): Promise<WorkItemStatus> {
    const { data } = await api.patch<WorkItemStatus>(`/workflow-statuses/${id}`, payload);
    return data;
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
