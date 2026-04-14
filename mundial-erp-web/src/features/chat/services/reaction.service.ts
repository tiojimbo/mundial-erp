import { api } from '@/lib/api';
import type { CursorPaginatedResponse } from '@/types/api.types';
import type { Reaction } from '../types/chat.types';

export const reactionService = {
  async add(messageId: string, emojiName: string): Promise<void> {
    await api.post(`/chat/messages/${messageId}/reactions`, { emojiName });
  },

  async remove(messageId: string, emojiName: string): Promise<void> {
    await api.delete(
      `/chat/messages/${messageId}/reactions/${emojiName}`,
    );
  },

  async getByMessage(
    messageId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<CursorPaginatedResponse<Reaction>> {
    const { data } = await api.get<CursorPaginatedResponse<Reaction>>(
      `/chat/messages/${messageId}/reactions`,
      { params },
    );
    return data;
  },
};
