import { api } from '@/lib/api';
import type {
  ApiResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type {
  Channel,
  ChannelMember,
  ChannelFilters,
  CreateChannelPayload,
  CreateDmPayload,
  UpdateChannelPayload,
  AddMembersPayload,
} from '../types/chat.types';

export const channelService = {
  async getAll(
    filters?: ChannelFilters,
  ): Promise<CursorPaginatedResponse<Channel>> {
    const { data } = await api.get<CursorPaginatedResponse<Channel>>(
      '/chat/channels',
      { params: filters },
    );
    return data;
  },

  async getById(id: string): Promise<Channel> {
    const { data } = await api.get<ApiResponse<Channel>>(
      `/chat/channels/${id}`,
    );
    return data.data;
  },

  async create(payload: CreateChannelPayload): Promise<Channel> {
    const { data } = await api.post<ApiResponse<Channel>>(
      '/chat/channels',
      payload,
    );
    return data.data;
  },

  async createDm(payload: CreateDmPayload): Promise<Channel> {
    const { data } = await api.post<ApiResponse<Channel>>(
      '/chat/channels/direct-message',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateChannelPayload,
  ): Promise<Channel> {
    const { data } = await api.patch<ApiResponse<Channel>>(
      `/chat/channels/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/chat/channels/${id}`);
  },

  async getMembers(
    channelId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<CursorPaginatedResponse<ChannelMember>> {
    const { data } = await api.get<
      CursorPaginatedResponse<ChannelMember>
    >(`/chat/channels/${channelId}/members`, { params });
    return data;
  },

  async addMembers(
    channelId: string,
    payload: AddMembersPayload,
  ): Promise<void> {
    await api.post(`/chat/channels/${channelId}/members`, payload);
  },

  async removeMember(
    channelId: string,
    userId: string,
  ): Promise<void> {
    await api.delete(`/chat/channels/${channelId}/members/${userId}`);
  },

  async follow(channelId: string): Promise<void> {
    await api.post(`/chat/channels/${channelId}/follow`);
  },

  async unfollow(channelId: string): Promise<void> {
    await api.delete(`/chat/channels/${channelId}/follow`);
  },

  async markAsRead(channelId: string): Promise<void> {
    await api.post(`/chat/channels/${channelId}/read`);
  },

  async closeDm(channelId: string): Promise<void> {
    await api.post(`/chat/channels/${channelId}/close`);
  },

  async openDm(channelId: string): Promise<void> {
    await api.post(`/chat/channels/${channelId}/open`);
  },
};
