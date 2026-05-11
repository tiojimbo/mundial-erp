import { api } from '@/lib/api';
import type {
  ApiResponse,
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
  const outer = (body as { data?: unknown })?.data;
  if (
    outer !== null &&
    typeof outer === 'object' &&
    'data' in outer &&
    'meta' in outer
  ) {
    return (outer as { data: T }).data;
  }
  return outer as T;
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
    const { data } = await api.put<ApiResponse<Task>>(
      `/tasks/${taskId}`,
      payload,
    );
    return data.data;
  },

  async remove(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },
};
