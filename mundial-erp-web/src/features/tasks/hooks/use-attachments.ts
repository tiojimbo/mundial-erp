import { useQuery } from '@tanstack/react-query';
import { taskAttachmentsService } from '../services/task-attachments.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useAttachments(taskId: string, enabled = true) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.attachments(workspaceId, taskId),
    queryFn: () => taskAttachmentsService.list(taskId),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId) && Boolean(taskId) && enabled,
  });
}
