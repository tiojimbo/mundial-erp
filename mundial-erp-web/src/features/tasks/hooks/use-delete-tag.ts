import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useDeleteTag() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, string>({
    mutationKey: [workspaceId, 'tasks', 'tags', 'delete'],
    mutationFn: (tagId) => taskTagsService.remove(tagId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.tags(workspaceId) });
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao excluir tag');
    },
  });
}
