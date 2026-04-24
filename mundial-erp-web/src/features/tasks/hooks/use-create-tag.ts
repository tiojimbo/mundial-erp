import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTagsService } from '../services/task-tags.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { CreateTagDto, TaskTag } from '../types/task.types';

export function useCreateTag() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskTag, Error, CreateTagDto>({
    mutationKey: [workspaceId, 'tasks', 'tags', 'create'],
    mutationFn: (payload) => taskTagsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.tags(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar tag');
    },
  });
}
