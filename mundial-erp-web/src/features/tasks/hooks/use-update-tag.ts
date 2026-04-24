import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { TaskTag, UpdateTagDto } from '../types/task.types';

type Vars = { tagId: string; payload: UpdateTagDto };

export function useUpdateTag() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskTag, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'tags', 'update'],
    mutationFn: ({ tagId, payload }) =>
      taskTagsService.update(tagId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.tags(workspaceId) });
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao atualizar tag');
    },
  });
}
