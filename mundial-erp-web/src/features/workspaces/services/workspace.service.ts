import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  AddMemberPayload,
  CreateInvitePayload,
  CreateWorkspacePayload,
  SelectWorkspaceResponse,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceFilters,
  WorkspaceInvite,
  WorkspaceInviteFilters,
  WorkspaceMember,
  WorkspaceMemberFilters,
  WorkspaceRole,
  WorkspaceSeats,
} from '../types/workspace.types';

export const workspaceService = {
  async list(filters?: WorkspaceFilters): Promise<PaginatedResponse<Workspace>> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    const { data } = await api.get<PaginatedResponse<Workspace>>('/workspaces', {
      params,
    });
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

  async update(id: string, payload: UpdateWorkspacePayload): Promise<Workspace> {
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

  async getMembers(
    id: string,
    filters?: WorkspaceMemberFilters,
  ): Promise<PaginatedResponse<WorkspaceMember>> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.role) params.role = filters.role;
    const { data } = await api.get<PaginatedResponse<WorkspaceMember>>(
      `/workspaces/${id}/members`,
      { params },
    );
    return data;
  },

  async addMember(
    id: string,
    payload: AddMemberPayload,
  ): Promise<WorkspaceMember> {
    const { data } = await api.post<ApiResponse<WorkspaceMember>>(
      `/workspaces/${id}/members`,
      payload,
    );
    return data.data;
  },

  async updateMemberRole(
    id: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    const { data } = await api.patch<ApiResponse<WorkspaceMember>>(
      `/workspaces/${id}/members/${userId}`,
      { role },
    );
    return data.data;
  },

  async removeMember(id: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${id}/members/${userId}`);
  },

  async getInvites(
    id: string,
    filters?: WorkspaceInviteFilters,
  ): Promise<PaginatedResponse<WorkspaceInvite>> {
    const params: Record<string, unknown> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.status) params.status = filters.status;
    const { data } = await api.get<PaginatedResponse<WorkspaceInvite>>(
      `/workspaces/${id}/invites`,
      { params },
    );
    return data;
  },

  async createInvite(
    id: string,
    payload: CreateInvitePayload,
  ): Promise<WorkspaceInvite> {
    const { data } = await api.post<ApiResponse<WorkspaceInvite>>(
      `/workspaces/${id}/invites`,
      payload,
    );
    return data.data;
  },

  async acceptInvite(token: string): Promise<WorkspaceMember> {
    const { data } = await api.post<ApiResponse<WorkspaceMember>>(
      `/workspaces/join/${token}`,
    );
    return data.data;
  },

  async revokeInvite(id: string, inviteId: string): Promise<void> {
    await api.delete(`/workspaces/${id}/invites/${inviteId}`);
  },
};
