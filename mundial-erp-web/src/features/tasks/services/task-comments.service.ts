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

/**
 * Comments — PLANO-TASKS.md §7.3.
 *
 * Rotas:
 * - GET    /tasks/:taskId/comments         (paginado)
 * - POST   /tasks/:taskId/comments         body {body, bodyBlocks?}
 * - PATCH  /task-comments/:commentId
 * - DELETE /task-comments/:commentId
 */

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
      `/tasks/${taskId}/comments`,
      { params },
    );
    return data;
  },

  async create(
    taskId: string,
    payload: CommentCreateDto,
  ): Promise<TaskComment> {
    const { data } = await api.post<ApiResponse<TaskComment>>(
      `/tasks/${taskId}/comments`,
      payload,
    );
    return data.data;
  },

  async update(
    commentId: string,
    payload: CommentUpdateDto,
  ): Promise<TaskComment> {
    const { data } = await api.patch<ApiResponse<TaskComment>>(
      `/task-comments/${commentId}`,
      payload,
    );
    return data.data;
  },

  async remove(commentId: string): Promise<void> {
    await api.delete(`/task-comments/${commentId}`);
  },
};
