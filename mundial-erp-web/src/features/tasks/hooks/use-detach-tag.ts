import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task } from '../types/task.types';

type Vars = { taskId: string; tagId: string };
type Context = { previousDetail: Task | undefined };

export function useDetachTag() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<void, Error, Vars, Context>({
    mutationKey: [workspaceId, 'tasks', 'tags', 'detach'],
    mutationFn: ({ taskId, tagId }) =>
      taskTagsService.detach(taskId, tagId),

    onMutate: async ({ taskId, tagId }) => {
      const detailKey = taskQueryKeys.detail(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: detailKey });
      const previousDetail = qc.getQueryData<Task>(detailKey);
      if (previousDetail) {
        qc.setQueryData<Task>(detailKey, {
          ...previousDetail,
          tags: previousDetail.tags.filter((t) => t.id !== tagId),
        });
      }
      return { previousDetail };
    },

    onError: (err, { taskId }, ctx) => {
      if (ctx?.previousDetail) {
        qc.setQueryData(
          taskQueryKeys.detail(workspaceId, taskId),
          ctx.previousDetail,
        );
      }
      toast.error(err.message || 'Erro ao remover tag');
    },

    onSettled: (_d, _e, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
    },
  });
}
