import { useQuery } from '@tanstack/react-query';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type UseTaskOptions = {
  include?: string[];
  enabled?: boolean;
};

/**
 * Sprint 0 stub — Sprint 1 (TSK-111) adicionara SSE para realtime
 * (PLANO-TASKS.md §10.8, CTO note #11).
 */
export function useTask(taskId: string, options: UseTaskOptions = {}) {
  const { include, enabled = true } = options;
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.detail(workspaceId, taskId, include),
    queryFn: () => tasksService.getById(taskId, include),
    enabled: Boolean(taskId) && Boolean(workspaceId) && enabled,
  });
}
