import { useQuery } from '@tanstack/react-query';
import { taskWatchersService } from '../services/task-watchers.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useWatchers(taskId: string, enabled = true) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.watchers(workspaceId, taskId),
    queryFn: () => taskWatchersService.list(taskId),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
