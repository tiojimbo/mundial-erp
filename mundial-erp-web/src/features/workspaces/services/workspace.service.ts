import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  BulkAddResponse,
  BulkAddUsersPayload,
  CreateWorkspacePayload,
  SelectWorkspaceResponse,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceFilters,
  WorkspaceRole,
  WorkspaceSeats,
  WorkspaceUsersFilters,
  WorkspaceUsersResponse,
} from '../types/workspace.types';

export const workspaceService = {
  async list(
    filters?: WorkspaceFilters,
  ): Promise<PaginatedResponse<Workspace>> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    const { data } = await api.get<PaginatedResponse<Workspace>>(
      '/workspaces',
      {
        params,
      },
    );
    return data;
  },

  async getById(id: string): Promise<Workspace> {
    const { data } = await api.get<ApiResponse<Workspace>>(`/workspaces/${id}`);
    return data.data;
  },

  async create(payload: CreateWorkspacePayload): Promise<Workspace> {
    const { data } = await api.post<ApiResponse<Workspace>>(
      '/workspaces',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateWorkspacePayload,
  ): Promise<Workspace> {
    const { data } = await api.patch<ApiResponse<Workspace>>(
      `/workspaces/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async select(workspaceId: string): Promise<SelectWorkspaceResponse> {
    const { data } = await api.post<ApiResponse<SelectWorkspaceResponse>>(
      `/workspaces/${workspaceId}/select`,
    );
    return data.data;
  },

  async getSeats(id: string): Promise<WorkspaceSeats> {
    const { data } = await api.get<ApiResponse<WorkspaceSeats>>(
      `/workspaces/${id}/seats`,
    );
    return data.data;
  },

  async getUsers(
    id: string,
    filters?: WorkspaceUsersFilters,
  ): Promise<WorkspaceUsersResponse> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.showPending) params.showPending = true;
    const { data } = await api.get<ApiResponse<WorkspaceUsersResponse>>(
      `/workspaces/${id}/users`,
      { params },
    );
    return data.data;
  },

  async bulkAddUsers(
    id: string,
    payload: BulkAddUsersPayload,
  ): Promise<BulkAddResponse> {
    const { data } = await api.post<ApiResponse<BulkAddResponse>>(
      `/workspaces/${id}/users/bulk`,
      payload,
    );
    return data.data;
  },

  async setUserPermission(
    id: string,
    userId: string,
    permission: WorkspaceRole,
  ): Promise<void> {
    await api.post(`/workspaces/${id}/users/${userId}/permission`, {
      permission,
    });
  },

  async removeUser(id: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${id}/users/${userId}/remove`);
  },
};
