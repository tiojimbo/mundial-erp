import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { WorkspaceMemberFilters } from '../types/workspace.types';

export function workspaceMembersKey(
  workspaceId: string,
  filters?: WorkspaceMemberFilters,
) {
  return [...WORKSPACES_KEY, workspaceId, 'members', filters] as const;
}

export function useWorkspaceMembers(
  workspaceId: string,
  filters?: WorkspaceMemberFilters,
) {
  return useQuery({
    queryKey: workspaceMembersKey(workspaceId, filters),
    queryFn: () => workspaceService.getMembers(workspaceId, filters),
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
