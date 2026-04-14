import { api } from '@/lib/api';
import type {
  ApiResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type {
  Message,
  MessageFilters,
  SendMessagePayload,
  UpdateMessagePayload,
} from '../types/chat.types';

export const messageService = {
  async getByChannel(
    channelId: string,
    params?: MessageFilters,
  ): Promise<CursorPaginatedResponse<Message>> {
    const { data } = await api.get<CursorPaginatedResponse<Message>>(
      `/chat/channels/${channelId}/messages`,
      { params },
    );
    return data;
  },

  async send(
    channelId: string,
    payload: SendMessagePayload,
  ): Promise<Message> {
    const { data } = await api.post<ApiResponse<Message>>(
      `/chat/channels/${channelId}/messages`,
      payload,
    );
    return data.data;
  },

  async getById(
    channelId: string,
    messageId: string,
  ): Promise<Message> {
    const { data } = await api.get<ApiResponse<Message>>(
      `/chat/channels/${channelId}/messages/${messageId}`,
    );
    return data.data;
  },

  async update(
    messageId: string,
    payload: UpdateMessagePayload,
  ): Promise<Message> {
    const { data } = await api.patch<ApiResponse<Message>>(
      `/chat/messages/${messageId}`,
      payload,
    );
    return data.data;
  },

  async remove(messageId: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}`);
  },

  async getReplies(
    messageId: string,
    params?: MessageFilters,
  ): Promise<CursorPaginatedResponse<Message>> {
    const { data } = await api.get<CursorPaginatedResponse<Message>>(
      `/chat/messages/${messageId}/replies`,
      { params },
    );
    return data;
  },
};
