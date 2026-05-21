import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { CustomTaskType } from '../types/task.types';

export const workspaceTaskTypesService = {
  async list(workspaceId: string): Promise<CustomTaskType[]> {
    const { data } = await api.get<ApiResponse<CustomTaskType[]>>(
      `/workspaces/${workspaceId}/task-types`,
    );
    return data.data;
  },
};
