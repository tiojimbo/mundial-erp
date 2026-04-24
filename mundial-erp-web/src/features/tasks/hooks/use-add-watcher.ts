import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskWatchersService } from '../services/task-watchers.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { TaskWatcher } from '../types/task.types';

type Vars = { taskId: string; userId: string };

export function useAddWatcher() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskWatcher, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'watchers', 'add'],
    mutationFn: ({ taskId, userId }) =>
      taskWatchersService.add(taskId, userId),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.watchers(workspaceId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao adicionar watcher');
    },
  });
}
