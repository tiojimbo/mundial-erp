import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { MyTasksResponse } from '../types/my-tasks.types';

export const myTasksService = {
  async getMyTasks(): Promise<MyTasksResponse> {
    const { data } = await api.get<ApiResponse<MyTasksResponse>>('/work-items/my-tasks');
    return data.data;
  },
};
