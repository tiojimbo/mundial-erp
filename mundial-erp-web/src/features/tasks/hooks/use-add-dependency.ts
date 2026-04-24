import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskDependenciesService } from '../services/task-dependencies.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { CreateDependencyDto, TaskDependency } from '../types/task.types';

type Vars = { taskId: string; payload: CreateDependencyDto };

export function useAddDependency() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskDependency, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'dependencies', 'add'],
    mutationFn: ({ taskId, payload }) =>
      taskDependenciesService.create(taskId, payload),
    onSuccess: (_data, { taskId, payload }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.dependencies(workspaceId, taskId),
      });
      // Outro lado da relacao tambem deve invalidar.
      const otherId = payload.dependsOn ?? payload.dependencyOf;
      if (otherId) {
        qc.invalidateQueries({
          queryKey: taskQueryKeys.dependencies(workspaceId, otherId),
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao adicionar dependencia');
    },
  });
}
