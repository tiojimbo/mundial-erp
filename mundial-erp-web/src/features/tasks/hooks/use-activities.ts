import { useQuery } from '@tanstack/react-query';
import {
  taskActivitiesService,
  type TaskActivitiesListParams,
  type ActivitiesListResponse,
} from '../services/task-activities.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useActivities(
  taskId: string,
  params?: Omit<TaskActivitiesListParams, 'cursor' | 'page'>,
  enabled = true,
) {
  const workspaceId = useWorkspaceId();
  return useQuery<ActivitiesListResponse>({
    queryKey: taskQueryKeys.activities(workspaceId, taskId, params),
    queryFn: () => taskActivitiesService.list(taskId, params),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
