import { api } from '@/lib/api';
import type { TaskActivity } from '../types/task.types';

export type ActivitiesListResponse = {
  items: TaskActivity[];
  total: number;
};

export type TaskActivitiesListParams = {
  page?: number;
  limit?: number;
  cursor?: string;
  type?: 'ALL' | 'ACTIVITY' | 'COMMENT';
  action?: string;
  actorId?: string | string[];
};

export const taskActivitiesService = {
  async list(
    taskId: string,
    params?: TaskActivitiesListParams,
  ): Promise<ActivitiesListResponse> {
    const { data } = await api.get<ActivitiesListResponse>(
      `/tasks-activities/${taskId}`,
      { params },
    );
    return data;
  },
};
