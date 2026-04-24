import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskCommentsService } from '../services/task-comments.service';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { CommentUpdateDto, TaskComment } from '../types/task.types';

type Vars = {
  taskId: string;
  commentId: string;
  payload: CommentUpdateDto;
};

export function useUpdateComment() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskComment, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'comments', 'update'],
    mutationFn: ({ commentId, payload }) =>
      taskCommentsService.update(commentId, payload),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: [
          workspaceId,
          'tasks',
          taskId,
          'comments',
        ] as readonly unknown[],
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao atualizar comentario');
    },
  });
}
