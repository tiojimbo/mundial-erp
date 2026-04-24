import { useInfiniteQuery } from '@tanstack/react-query';
import {
  taskActivitiesService,
  type TaskActivitiesListParams,
} from '../services/task-activities.service';
import type {
  PaginatedResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type { TaskActivity } from '../types/task.types';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type ActivitiesPage =
  | PaginatedResponse<TaskActivity>
  | CursorPaginatedResponse<TaskActivity>;

function hasCursor(
  page: ActivitiesPage,
): page is CursorPaginatedResponse<TaskActivity> {
  return 'cursor' in page.meta;
}

export function useActivities(
  taskId: string,
  params?: Omit<TaskActivitiesListParams, 'cursor' | 'page'>,
  enabled = true,
) {
  const workspaceId = useWorkspaceId();
  return useInfiniteQuery<
    ActivitiesPage,
    Error,
    ActivitiesPage,
    readonly unknown[],
    string | number | undefined
  >({
    queryKey: taskQueryKeys.activities(workspaceId, taskId, params),
    queryFn: ({ pageParam }) => {
      const query: TaskActivitiesListParams = { ...(params ?? {}) };
      if (typeof pageParam === 'string') query.cursor = pageParam;
      if (typeof pageParam === 'number') query.page = pageParam;
      return taskActivitiesService.list(taskId, query);
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => {
      if (hasCursor(last)) {
        const cursor = last.meta.cursor;
        if (!cursor) return undefined;
        return cursor.hasMore ? cursor.next ?? undefined : undefined;
      }
      const pagination = last.meta.pagination;
      if (!pagination) return undefined;
      const { page, totalPages } = pagination;
      if (page < totalPages) return page + 1;
      return undefined;
    },
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
