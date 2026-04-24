import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type {
  CursorPaginatedResponse,
  PaginatedResponse,
} from '@/types/api.types';
import type { Task, TaskFilters } from '../types/task.types';

type TasksPage =
  | PaginatedResponse<Task>
  | CursorPaginatedResponse<Task>;

function hasCursor(page: TasksPage): page is CursorPaginatedResponse<Task> {
  return 'cursor' in page.meta;
}

/**
 * Paginacao cursor/offset para `/tasks` — TSK-707.
 *
 * Uso tipico no `task-list-view`:
 *   const query = useInfiniteTasks(filters);
 *   const tasks = query.data?.pages.flatMap((p) => p.data) ?? [];
 *
 * Virtualizacao (>= 500 itens) fica no consumer (react-virtual) para
 * evitar rerender de elementos fora do viewport.
 */
export function useInfiniteTasks(filters?: TaskFilters) {
  const workspaceId = useWorkspaceId();

  return useInfiniteQuery<
    TasksPage,
    Error,
    InfiniteData<TasksPage, string | number | undefined>,
    readonly unknown[],
    string | number | undefined
  >({
    queryKey: taskQueryKeys.list(workspaceId, filters),
    queryFn: ({ pageParam }) => {
      const next: TaskFilters = { ...(filters ?? {}) };
      if (typeof pageParam === 'string') next.cursor = pageParam;
      if (typeof pageParam === 'number') next.page = pageParam;
      return tasksService.list(next);
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => {
      if (hasCursor(last)) {
        return last.meta.cursor.hasMore
          ? (last.meta.cursor.next ?? undefined)
          : undefined;
      }
      const { page, totalPages } = last.meta.pagination;
      if (page < totalPages) return page + 1;
      return undefined;
    },
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId),
  });
}
