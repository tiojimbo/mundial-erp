import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { SidebarDepartment } from '../types/navigation.types';
import type { DepartmentDetail, AreaDetail, ProcessSummary } from '../types/process-summary.types';

export const navigationService = {
  async getSidebarTree(): Promise<SidebarDepartment[]> {
    const { data } = await api.get<ApiResponse<SidebarDepartment[]>>(
      '/departments/sidebar',
    );
    return data.data;
  },

  async getDepartmentBySlug(slug: string): Promise<DepartmentDetail> {
    const { data } = await api.get<ApiResponse<DepartmentDetail>>(
      `/departments/by-slug/${slug}`,
    );
    return data.data;
  },

  async getAreaBySlug(slug: string): Promise<AreaDetail> {
    const { data } = await api.get<ApiResponse<AreaDetail>>(
      `/areas/by-slug/${slug}`,
    );
    return data.data;
  },

  async getDepartmentProcessSummaries(
    departmentId: string,
    showClosed = false,
  ): Promise<ProcessSummary[]> {
    const { data } = await api.get<ApiResponse<ProcessSummary[]>>(
      `/departments/${departmentId}/process-summaries`,
      { params: { showClosed } },
    );
    return data.data;
  },

  async getAreaProcessSummaries(
    areaId: string,
    showClosed = false,
  ): Promise<ProcessSummary[]> {
    const { data } = await api.get<ApiResponse<ProcessSummary[]>>(
      `/areas/${areaId}/process-summaries`,
      { params: { showClosed } },
    );
    return data.data;
  },
};
