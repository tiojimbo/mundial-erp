import { useQuery } from '@tanstack/react-query';
import {
  tasksService,
  type TasksGroupedResponse,
} from '../services/tasks.service';

export const TASKS_GROUPED_KEY = ['tasks', 'grouped'];

export function useTasksGrouped(listId: string | null | undefined) {
  return useQuery<TasksGroupedResponse>({
    queryKey: [...TASKS_GROUPED_KEY, 'list', listId],
    queryFn: () => tasksService.findGroupedByList(listId!),
    enabled: !!listId,
  });
}
