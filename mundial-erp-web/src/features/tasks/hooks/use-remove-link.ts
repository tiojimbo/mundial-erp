import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskLinksService } from '../services/task-links.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Vars = { taskId: string; linkId: string };

export function useRemoveLink() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'links', 'remove'],
    mutationFn: ({ taskId, linkId }) => taskLinksService.remove(taskId, linkId),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao remover vinculo');
    },
  });
}
