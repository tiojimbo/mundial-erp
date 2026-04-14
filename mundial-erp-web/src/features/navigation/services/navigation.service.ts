import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { SidebarDepartment } from '../types/navigation.types';

export const navigationService = {
  async getSidebarTree(): Promise<SidebarDepartment[]> {
    const { data } = await api.get<ApiResponse<SidebarDepartment[]>>(
      '/departments/sidebar',
    );
    return data.data;
  },
};
