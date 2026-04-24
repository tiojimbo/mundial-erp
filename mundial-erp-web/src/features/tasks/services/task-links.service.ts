import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { TaskLink } from '../types/task.types';

/**
 * Links (related-to) — PLANO-TASKS.md §7.3.
 *
 * Rotas:
 * - GET    /tasks/:taskId/links
 * - POST   /tasks/:taskId/links/:linksToId
 * - DELETE /tasks/:taskId/links/:linksToId
 */
export const taskLinksService = {
  async list(taskId: string): Promise<TaskLink[]> {
    const { data } = await api.get<ApiResponse<TaskLink[]>>(
      `/tasks/${taskId}/links`,
    );
    return data.data;
  },

  async create(taskId: string, linksToId: string): Promise<TaskLink> {
    const { data } = await api.post<ApiResponse<TaskLink>>(
      `/tasks/${taskId}/links/${linksToId}`,
    );
    return data.data;
  },

  async remove(taskId: string, linksToId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/links/${linksToId}`);
  },
};
