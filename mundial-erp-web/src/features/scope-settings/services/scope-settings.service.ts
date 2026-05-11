import { api } from '@/lib/api';
import type {
  ScopeKind,
  Visibility,
  Permission,
  ScopeMember,
  ResourcesMetadata,
} from '../types/scope.types';

export const scopeSettingsService = {
  async getVisibility(
    scope: ScopeKind,
    id: string,
  ): Promise<{ visibility: Visibility }> {
    const { data } = await api.get<{ visibility: Visibility }>(
      `/${scope}/${id}/visibility`,
    );
    return data;
  },

  async setVisibility(
    scope: ScopeKind,
    id: string,
    visibility: Visibility,
  ): Promise<{ visibility: Visibility }> {
    const { data } = await api.put<{ visibility: Visibility }>(
      `/${scope}/${id}/visibility`,
      { visibility },
    );
    return data;
  },

  async listMembers(scope: ScopeKind, id: string): Promise<ScopeMember[]> {
    const { data } = await api.get<ScopeMember[]>(`/${scope}/${id}/members`);
    return data;
  },

  async addMember(
    scope: ScopeKind,
    id: string,
    userId: string,
    permission: Permission,
  ): Promise<ScopeMember> {
    const { data } = await api.post<ScopeMember>(`/${scope}/${id}/members`, {
      userId,
      permission,
    });
    return data;
  },

  async updateMember(
    scope: ScopeKind,
    id: string,
    userId: string,
    permission: Permission,
  ): Promise<ScopeMember> {
    const { data } = await api.put<ScopeMember>(
      `/${scope}/${id}/members/${userId}`,
      { permission },
    );
    return data;
  },

  async removeMember(
    scope: ScopeKind,
    id: string,
    userId: string,
  ): Promise<void> {
    await api.delete(`/${scope}/${id}/members/${userId}`);
  },

  async getResources(
    scope: ScopeKind,
    id: string,
  ): Promise<ResourcesMetadata> {
    const { data } = await api.get<ResourcesMetadata>(
      `/${scope}/${id}/resources`,
    );
    return data;
  },
};
