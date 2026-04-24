import { useQuery } from '@tanstack/react-query';
import { taskLinksService } from '../services/task-links.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useLinks(taskId: string, enabled = true) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.links(workspaceId, taskId),
    queryFn: () => taskLinksService.list(taskId),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
