import { api } from '@/lib/api';
import type {
  PaginatedResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type { TaskActivity } from '../types/task.types';

/**
 * Activities — PLANO-TASKS.md §7.1 linha 566.
 *
 * Rota:
 * - GET /tasks/:taskId/activities?type&action&actorId&page&limit&cursor
 *
 * `action` aceita string CSV (ex: `STATUS_CHANGED,COMMENT_ADDED`) —
 * contrato do backend Sprint 5 (TSK-160).
 */

type ActivitiesListResponse =
  | PaginatedResponse<TaskActivity>
  | CursorPaginatedResponse<TaskActivity>;

export type TaskActivitiesListParams = {
  page?: number;
  limit?: number;
  cursor?: string;
  /** Grupo de filtros de alto nivel. */
  type?: 'ALL' | 'ACTIVITY' | 'COMMENT';
  /** Lista CSV de `TaskActivityType` (ex: `STATUS_CHANGED,COMMENT_ADDED`). */
  action?: string;
  /** UUID unico de actor. Listas maiores viram multiplos params no axios. */
  actorId?: string | string[];
};

export const taskActivitiesService = {
  async list(
    taskId: string,
    params?: TaskActivitiesListParams,
  ): Promise<ActivitiesListResponse> {
    const { data } = await api.get<ActivitiesListResponse>(
      `/tasks/${taskId}/activities`,
      { params },
    );
    return data;
  },
};
