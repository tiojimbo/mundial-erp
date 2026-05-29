import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { moveTaskService } from '../services/move-task.service';
import type { MoveToListPayload } from '../services/move-task.service';
import { taskQueryKeys } from '../lib/query-keys';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';
import { useWorkspaceId } from '../lib/use-workspace-id';

export function useMoveTask() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<{ moved: number }, Error, MoveToListPayload>({
    mutationFn: (payload) => moveTaskService.moveToList(payload),
    onSuccess: ({ moved }) => {
      toast.success(
        moved === 0
          ? 'Nenhuma tarefa movida'
          : `${moved} ${moved === 1 ? 'tarefa movida' : 'tarefas movidas'}`,
      );
    },
    onError: () => {
      toast.error('Erro ao mover tarefa(s)');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: TASKS_GROUPED_KEY });
    },
  });
}
