import { api } from '@/lib/api';
import type {
  PaginatedResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type {
  Task,
  TaskFilters,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../types/task.types';

type TasksListResponse =
  | PaginatedResponse<Task>
  | CursorPaginatedResponse<Task>;

function buildTaskParams(filters?: TaskFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!filters) return params;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    params[key] = value;
  }
  return params;
}

function unwrapEnvelope<T>(body: unknown): T {
  if (body === null || typeof body !== 'object') {
    return body as T;
  }
  if ('data' in body && 'meta' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const tasksService = {
  async list(filters?: TaskFilters): Promise<TasksListResponse> {
    const { data } = await api.get<TasksListResponse>('/tasks', {
      params: buildTaskParams(filters),
    });
    return data;
  },

  async getById(taskId: string, include?: string[]): Promise<Task> {
    if (!taskId || taskId === 'undefined') {
      throw new Error(`getById recebeu taskId invalido: "${taskId}"`);
    }
    const params: Record<string, unknown> = {};
    if (include && include.length > 0) params.include = include.join(',');
    const res = await api.get<unknown>(`/tasks/${taskId}`, { params });
    return unwrapEnvelope<Task>(res.data);
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const { processId, ...body } = payload;
    const res = await api.post<unknown>('/tasks', {
      listId: processId,
      ...body,
    });
    return unwrapEnvelope<Task>(res.data);
  },

  async update(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const res = await api.put<unknown>(`/tasks/${taskId}`, payload);
    return unwrapEnvelope<Task>(res.data);
  },

  async remove(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async findGroupedByList(listId: string): Promise<TasksGroupedResponse> {
    const res = await api.get<unknown>(`/tasks/list`, {
      params: { level: 'list', listId },
    });
    return unwrapEnvelope<TasksGroupedResponse>(res.data);
  },

  async bulkUpdate(tasks: BulkUpdateTaskItem[]): Promise<Task[]> {
    const res = await api.put<unknown>(`/tasks/bulk`, { tasks });
    return unwrapEnvelope<Task[]>(res.data);
  },

  async bulkDelete(taskIds: string[]): Promise<{ count: number }> {
    const res = await api.delete<unknown>(`/tasks/bulk`, {
      data: { taskIds },
    });
    return unwrapEnvelope<{ count: number }>(res.data);
  },

  async assign(taskId: string, userIds: string[]): Promise<Task> {
    const res = await api.put<unknown>(`/tasks/${taskId}/assign`, {
      assignees: userIds.map((userId) => ({ userId })),
    });
    return unwrapEnvelope<Task>(res.data);
  },
};

export type BulkUpdateTaskItem = {
  id: string;
  statusId?: string;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'NONE';
  primaryAssigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  listId?: string;
  archived?: boolean;
};

export type TasksGroupedGroup = {
  id: string;
  name: string;
  label: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  type: 'STATUS';
  collapsed: boolean;
  field: string;
  position: number;
  viewId: string | null;
  color: string;
};

export type TasksGroupedItem = {
  group: TasksGroupedGroup;
  tasks: Task[];
};

export type TasksGroupedResponse = TasksGroupedItem[];
