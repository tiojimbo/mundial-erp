import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskLinksService } from '../services/task-links.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { TaskLink } from '../types/task.types';

type Vars = { taskId: string; linksToId: string };

export function useAddLink() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskLink, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'links', 'add'],
    mutationFn: ({ taskId, linksToId }) =>
      taskLinksService.create(taskId, linksToId),
    onSuccess: (_data, { taskId, linksToId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, linksToId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao adicionar vinculo');
    },
  });
}
