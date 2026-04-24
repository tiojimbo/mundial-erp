import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskCommentsService } from '../services/task-comments.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { CommentCreateDto, TaskComment } from '../types/task.types';

type Vars = { taskId: string; payload: CommentCreateDto };

export function useCreateComment() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskComment, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'comments', 'create'],
    mutationFn: ({ taskId, payload }) =>
      taskCommentsService.create(taskId, payload),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: [
          workspaceId,
          'tasks',
          taskId,
          'comments',
        ] as readonly unknown[],
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.activities(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao publicar comentario');
    },
  });
}
