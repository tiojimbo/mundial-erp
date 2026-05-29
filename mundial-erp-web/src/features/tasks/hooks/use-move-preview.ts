import { useQuery } from '@tanstack/react-query';
import { moveTaskService } from '../services/move-task.service';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useMovePreview(taskIds: string[], targetListId: string | null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [
      workspaceId,
      'tasks',
      'move-preview',
      [...taskIds].sort(),
      targetListId,
    ],
    queryFn: () => moveTaskService.movePreview(taskIds, targetListId!),
    enabled: taskIds.length > 0 && !!targetListId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
