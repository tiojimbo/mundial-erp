import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskWatchersService } from '../services/task-watchers.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Vars = { taskId: string; userId: string };

export function useRemoveWatcher() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'watchers', 'remove'],
    mutationFn: ({ taskId, userId }) =>
      taskWatchersService.remove(taskId, userId),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.watchers(workspaceId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao remover watcher');
    },
  });
}
