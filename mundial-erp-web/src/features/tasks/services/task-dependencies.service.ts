import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  TaskDependenciesBundle,
  TaskDependency,
  CreateDependencyDto,
} from '../types/task.types';

/**
 * Dependencies — PLANO-TASKS.md §7.3 e §8.3.
 *
 * Rotas:
 * - GET    /tasks/:taskId/dependencies                       (retorna {blocking, waitingOn})
 * - POST   /tasks/:taskId/dependencies                       (body {dependsOn?|dependencyOf?})
 * - DELETE /tasks/:taskId/dependencies?dependsOn=&dependencyOf=
 */
export const taskDependenciesService = {
  async list(taskId: string): Promise<TaskDependenciesBundle> {
    const { data } = await api.get<ApiResponse<TaskDependenciesBundle>>(
      `/tasks/${taskId}/dependencies`,
    );
    return data.data;
  },

  async create(
    taskId: string,
    payload: CreateDependencyDto,
  ): Promise<TaskDependency> {
    const { data } = await api.post<ApiResponse<TaskDependency>>(
      `/tasks/${taskId}/dependencies`,
      payload,
    );
    return data.data;
  },

  async remove(
    taskId: string,
    params: { dependsOn?: string; dependencyOf?: string },
  ): Promise<void> {
    await api.delete(`/tasks/${taskId}/dependencies`, { params });
  },
};
