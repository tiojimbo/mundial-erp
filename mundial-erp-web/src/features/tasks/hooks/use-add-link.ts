import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  taskLinksService,
  type TaskLinkType,
} from '../services/task-links.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { TaskLink } from '../types/task.types';

type Vars = { taskId: string; taskToId: string; type: TaskLinkType };

export function useAddLink() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskLink, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'links', 'add'],
    mutationFn: ({ taskId, taskToId, type }) =>
      taskLinksService.create(taskId, { taskToId, type }),
    onSuccess: (_data, { taskId, taskToId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskQueryKeys.links(workspaceId, taskToId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao adicionar vinculo');
    },
  });
}
