import { useQuery } from '@tanstack/react-query';
import { taskDependenciesService } from '../services/task-dependencies.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useDependencies(taskId: string, enabled = true) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.dependencies(workspaceId, taskId),
    queryFn: () => taskDependenciesService.list(taskId),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
