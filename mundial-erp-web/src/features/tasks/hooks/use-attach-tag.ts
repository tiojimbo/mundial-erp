import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task, TaskTag } from '../types/task.types';

type Vars = { taskId: string; tag: TaskTag };
type Context = { previousDetail: Task | undefined };

/**
 * Attach tag com optimistic — PLANO §7.3.
 */
export function useAttachTag() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<void, Error, Vars, Context>({
    mutationKey: [workspaceId, 'tasks', 'tags', 'attach'],
    mutationFn: ({ taskId, tag }) => taskTagsService.attach(taskId, tag.id),

    onMutate: async ({ taskId, tag }) => {
      const detailKey = taskQueryKeys.detail(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: detailKey });
      const previousDetail = qc.getQueryData<Task>(detailKey);
      if (previousDetail) {
        const alreadyAttached = previousDetail.tags.some(
          (t) => t.id === tag.id,
        );
        if (!alreadyAttached) {
          qc.setQueryData<Task>(detailKey, {
            ...previousDetail,
            tags: [...previousDetail.tags, tag],
          });
        }
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
      toast.error(err.message || 'Erro ao adicionar tag');
    },

    onSettled: (_d, _e, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, taskId),
      });
    },
  });
}
