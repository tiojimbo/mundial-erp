import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task, UpdateTaskPayload } from '../types/task.types';

type UpdateTaskVars = {
  taskId: string;
  payload: UpdateTaskPayload;
};

type Context = {
  previousDetail: Task | undefined;
};

export function useUpdateTask() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<Task, Error, UpdateTaskVars, Context>({
    mutationKey: [workspaceId, 'tasks', 'update'],
    mutationFn: ({ taskId, payload }) =>
      tasksService.update(taskId, payload),

    // Optimistic: atualiza detail imediatamente; rollback em onError.
    onMutate: async ({ taskId, payload }) => {
      const detailKey = taskQueryKeys.detail(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: detailKey });
      const previousDetail = qc.getQueryData<Task>(detailKey);
      if (previousDetail) {
        qc.setQueryData<Task>(detailKey, {
          ...previousDetail,
          ...payload,
        } as Task);
      }
      return { previousDetail };
    },

    onError: (err, { taskId }, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(
          taskQueryKeys.detail(workspaceId, taskId),
          context.previousDetail,
        );
      }
      toast.error(err.message || 'Erro ao atualizar tarefa');
    },

    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
  });
}
