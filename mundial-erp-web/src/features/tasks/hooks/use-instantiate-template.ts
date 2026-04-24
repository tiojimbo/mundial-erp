import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTemplatesService } from '../services/task-templates.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task } from '../types/task.types';

type Vars = { processId: string; templateId: string };

export function useInstantiateTemplate() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<Task, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'templates', 'instantiate'],
    mutationFn: ({ processId, templateId }) =>
      taskTemplatesService.instantiate(processId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao instanciar template');
    },
  });
}
