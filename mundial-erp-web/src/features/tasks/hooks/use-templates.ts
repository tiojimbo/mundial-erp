import { useQuery } from '@tanstack/react-query';
import { taskTemplatesService } from '../services/task-templates.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useTemplates() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.templates(workspaceId),
    queryFn: () => taskTemplatesService.list(),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId),
  });
}
