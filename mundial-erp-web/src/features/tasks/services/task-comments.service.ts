import { api } from '@/lib/api';
import type {
  ApiResponse,
  PaginatedResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type {
  TaskComment,
  CommentCreateDto,
  CommentUpdateDto,
} from '../types/task.types';

type CommentsListResponse =
  | PaginatedResponse<TaskComment>
  | CursorPaginatedResponse<TaskComment>;

export type TaskCommentsListParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export const taskCommentsService = {
  async list(
    taskId: string,
    params?: TaskCommentsListParams,
  ): Promise<CommentsListResponse> {
    const { data } = await api.get<CommentsListResponse>(
      `/comments/task/${taskId}`,
      { params },
    );
    return data;
  },

  async create(
    taskId: string,
    payload: CommentCreateDto,
  ): Promise<TaskComment> {
    const { data } = await api.post<ApiResponse<TaskComment>>(
      '/comments',
      { taskId, ...payload },
    );
    return data.data;
  },

  async update(
    commentId: string,
    payload: CommentUpdateDto,
  ): Promise<TaskComment> {
    const { data } = await api.put<ApiResponse<TaskComment>>(
      `/comments/${commentId}`,
      payload,
    );
    return data.data;
  },

  async remove(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },

  async toggleReaction(
    commentId: string,
    emoji: string,
  ): Promise<{ action: 'added' | 'removed'; emoji: string }> {
    const { data } = await api.post<{
      action: 'added' | 'removed';
      emoji: string;
      commentId: string;
      userId: string;
    }>(`/comments/${commentId}/reactions`, { emoji });
    return { action: data.action, emoji: data.emoji };
  },
};
