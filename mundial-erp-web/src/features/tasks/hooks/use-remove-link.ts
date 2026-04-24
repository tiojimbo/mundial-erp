import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskLinksService } from '../services/task-links.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Vars = { taskId: string; linksToId: string };

export function useRemoveLink() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'links', 'remove'],
    mutationFn: ({ taskId, linksToId }) =>
      taskLinksService.remove(taskId, linksToId),
    onSuccess: (_data, { taskId, linksToId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, linksToId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao remover vinculo');
    },
  });
}
