import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useDeleteTask() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, string>({
    mutationKey: [workspaceId, 'tasks', 'delete'],
    mutationFn: (taskId) => tasksService.remove(taskId),
    onSuccess: (_data, taskId) => {
      qc.removeQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao excluir tarefa');
    },
  });
}
