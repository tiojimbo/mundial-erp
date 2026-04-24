import { useQuery } from '@tanstack/react-query';
import { taskChecklistsService } from '../services/task-checklists.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useChecklists(taskId: string, enabled = true) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.checklists(workspaceId, taskId),
    queryFn: () => taskChecklistsService.list(taskId),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
