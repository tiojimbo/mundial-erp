import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskCommentsService } from '../services/task-comments.service';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Vars = { taskId: string; commentId: string };

export function useDeleteComment() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'comments', 'delete'],
    mutationFn: ({ commentId }) => taskCommentsService.remove(commentId),
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
      toast.error(err.message || 'Erro ao excluir comentario');
    },
  });
}
