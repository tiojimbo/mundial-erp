import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  TaskTag,
  CreateTagDto,
  UpdateTagDto,
} from '../types/task.types';

/**
 * Tags de Task — PLANO-TASKS.md §7.3.
 *
 * Rotas:
 * - GET    /task-tags                      (list)
 * - POST   /task-tags                      (create)
 * - PATCH  /task-tags/:id                  (update)
 * - DELETE /task-tags/:id                  (delete)
 * - POST   /tasks/:taskId/tags/:tagId      (attach)
 * - DELETE /tasks/:taskId/tags/:tagId      (detach)
 */
export const taskTagsService = {
  async list(): Promise<TaskTag[]> {
    const { data } = await api.get<PaginatedResponse<TaskTag>>('/task-tags');
    return data.data;
  },

  async create(payload: CreateTagDto): Promise<TaskTag> {
    const { data } = await api.post<ApiResponse<TaskTag>>(
      '/task-tags',
      payload,
    );
    return data.data;
  },

  async update(tagId: string, payload: UpdateTagDto): Promise<TaskTag> {
    const { data } = await api.patch<ApiResponse<TaskTag>>(
      `/task-tags/${tagId}`,
      payload,
    );
    return data.data;
  },

  async remove(tagId: string): Promise<void> {
    await api.delete(`/task-tags/${tagId}`);
  },

  async attach(taskId: string, tagId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/tags/${tagId}`);
  },

  async detach(taskId: string, tagId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/tags/${tagId}`);
  },
};
