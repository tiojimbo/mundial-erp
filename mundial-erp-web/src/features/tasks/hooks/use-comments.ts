import { useQuery } from '@tanstack/react-query';
import {
  taskCommentsService,
  type TaskCommentsListParams,
} from '../services/task-comments.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useComments(
  taskId: string,
  params?: TaskCommentsListParams,
  enabled = true,
) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.comments(workspaceId, taskId, params),
    queryFn: () => taskCommentsService.list(taskId, params),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
