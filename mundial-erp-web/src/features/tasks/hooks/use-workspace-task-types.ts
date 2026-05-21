import { useQuery } from '@tanstack/react-query';
import { workspaceTaskTypesService } from '../services/workspace-task-types.service';

export const WORKSPACE_TASK_TYPES_KEY = (workspaceId: string) =>
  ['workspace-task-types', workspaceId] as const;

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export function useWorkspaceTaskTypes(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: WORKSPACE_TASK_TYPES_KEY(workspaceId ?? ''),
    queryFn: () => workspaceTaskTypesService.list(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: FIVE_MINUTES_IN_MS,
  });
}
