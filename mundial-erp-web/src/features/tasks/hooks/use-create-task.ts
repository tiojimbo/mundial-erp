import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { CreateTaskPayload, Task } from '../types/task.types';

/**
 * `useCreateTask` — cria uma Task via `POST /api/v1/processes/:processId/tasks`.
 *
 * Alem das listas globais de tasks, invalida os summaries de navegacao
 * (process/area/department) para que os contadores da sidebar e das telas
 * de nivel superior refletem a nova task imediatamente.
 */
export function useCreateTask() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<Task, Error, CreateTaskPayload>({
    mutationKey: [workspaceId, 'tasks', 'create'],
    mutationFn: (payload) => tasksService.create(payload),
    onSuccess: () => {
      // Listas de tasks (todas as combinacoes de filtro).
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
      qc.invalidateQueries({ queryKey: taskQueryKeys.all(workspaceId) });

      // Summaries de navegacao — afetados pela nova task.
      qc.invalidateQueries({
        predicate: (query) => {
          const [root] = query.queryKey as unknown[];
          if (typeof root !== 'string') return false;
          return (
            root === 'area-summaries' ||
            root === 'department-summaries' ||
            root === 'process-summary' ||
            root === 'sidebar-tree' ||
            root === 'work-items'
          );
        },
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar tarefa');
    },
  });
}
