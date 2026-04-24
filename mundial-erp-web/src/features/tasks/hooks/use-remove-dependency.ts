import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskDependenciesService } from '../services/task-dependencies.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Vars = {
  taskId: string;
  dependsOn?: string;
  dependencyOf?: string;
};

export function useRemoveDependency() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'dependencies', 'remove'],
    mutationFn: ({ taskId, dependsOn, dependencyOf }) =>
      taskDependenciesService.remove(taskId, { dependsOn, dependencyOf }),
    onSuccess: (_data, { taskId, dependsOn, dependencyOf }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.dependencies(workspaceId, taskId),
      });
      const otherId = dependsOn ?? dependencyOf;
      if (otherId) {
        qc.invalidateQueries({
          queryKey: taskQueryKeys.dependencies(workspaceId, otherId),
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao remover dependencia');
    },
  });
}
