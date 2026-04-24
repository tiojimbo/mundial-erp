import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { TaskWatcher } from '../types/task.types';

/**
 * Watchers — PLANO-TASKS.md §7.3.
 *
 * Rotas:
 * - GET    /tasks/:taskId/watchers
 * - POST   /tasks/:taskId/watchers/:userId
 * - DELETE /tasks/:taskId/watchers/:userId
 */
export const taskWatchersService = {
  async list(taskId: string): Promise<TaskWatcher[]> {
    const { data } = await api.get<ApiResponse<TaskWatcher[]>>(
      `/tasks/${taskId}/watchers`,
    );
    return data.data;
  },

  async add(taskId: string, userId: string): Promise<TaskWatcher> {
    const { data } = await api.post<ApiResponse<TaskWatcher>>(
      `/tasks/${taskId}/watchers/${userId}`,
    );
    return data.data;
  },

  async remove(taskId: string, userId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/watchers/${userId}`);
  },
};
