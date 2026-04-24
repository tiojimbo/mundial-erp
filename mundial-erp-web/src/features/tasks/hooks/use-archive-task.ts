import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task } from '../types/task.types';

type Context = { previousDetail: Task | undefined };

/**
 * Archive idempotente com rollback — PLANO §8.5.
 */
export function useArchiveTask() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<void, Error, string, Context>({
    mutationKey: [workspaceId, 'tasks', 'archive'],
    mutationFn: (taskId) => tasksService.archive(taskId),

    onMutate: async (taskId) => {
      const detailKey = taskQueryKeys.detail(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: detailKey });
      const previousDetail = qc.getQueryData<Task>(detailKey);
      if (previousDetail) {
        qc.setQueryData<Task>(detailKey, { ...previousDetail, archived: true });
      }
      return { previousDetail };
    },

    onError: (err, taskId, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(
          taskQueryKeys.detail(workspaceId, taskId),
          context.previousDetail,
        );
      }
      toast.error(err.message || 'Erro ao arquivar tarefa');
    },

    onSettled: (_d, _e, taskId) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
  });
}
