import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task } from '../types/task.types';

export function useAssignTask(taskId: string) {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<Task, Error, string[]>({
    mutationFn: (userIds) => tasksService.assign(taskId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao atualizar responsáveis');
    },
  });
}
