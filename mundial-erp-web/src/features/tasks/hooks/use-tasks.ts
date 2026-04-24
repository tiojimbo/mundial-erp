import { useQuery } from '@tanstack/react-query';
import { tasksService } from '../services/tasks.service';
import type { TaskFilters } from '../types/task.types';

export const TASKS_QUERY_KEY = ['tasks'] as const;

/**
 * Sprint 0 stub — Sprint 1 (TSK-110) adicionara placeholderData,
 * debounce de filtros e prefetch on-hover (PLANO-TASKS.md §11.2).
 */
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'list', filters] as const,
    queryFn: () => tasksService.list(filters),
    placeholderData: (prev) => prev,
  });
}
