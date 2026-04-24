import { useQuery } from '@tanstack/react-query';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useTags() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.tags(workspaceId),
    queryFn: () => taskTagsService.list(),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId),
  });
}
