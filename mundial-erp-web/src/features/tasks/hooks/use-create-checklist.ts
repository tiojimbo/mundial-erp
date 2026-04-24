import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskChecklistsService } from '../services/task-checklists.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type {
  CreateChecklistDto,
  TaskChecklist,
} from '../types/task.types';

type Vars = { taskId: string; payload: CreateChecklistDto };

export function useCreateChecklist() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskChecklist, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'checklists', 'create'],
    mutationFn: ({ taskId, payload }) =>
      taskChecklistsService.create(taskId, payload),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.checklists(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar checklist');
    },
  });
}
