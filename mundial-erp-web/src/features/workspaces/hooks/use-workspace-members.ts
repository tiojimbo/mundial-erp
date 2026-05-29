import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { WorkspaceUsersFilters } from '../types/workspace.types';

export function workspaceUsersKey(
  workspaceId: string,
  filters?: WorkspaceUsersFilters,
) {
  return [...WORKSPACES_KEY, workspaceId, 'users', filters] as const;
}

export function useWorkspaceUsers(
  workspaceId: string,
  filters?: WorkspaceUsersFilters,
) {
  return useQuery({
    queryKey: workspaceUsersKey(workspaceId, filters),
    queryFn: () => workspaceService.getUsers(workspaceId, filters),
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });
}

export function useWorkspaceSeats(workspaceId: string) {
  return useQuery({
    queryKey: [...WORKSPACES_KEY, workspaceId, 'seats'],
    queryFn: () => workspaceService.getSeats(workspaceId),
    enabled: !!workspaceId,
  });
}
