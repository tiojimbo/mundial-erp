import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { WorkspaceInviteFilters } from '../types/workspace.types';

export function workspaceInvitesKey(
  workspaceId: string,
  filters?: WorkspaceInviteFilters,
) {
  return [...WORKSPACES_KEY, workspaceId, 'invites', filters] as const;
}

export function useWorkspaceInvites(
  workspaceId: string,
  filters?: WorkspaceInviteFilters,
) {
  return useQuery({
    queryKey: workspaceInvitesKey(workspaceId, filters),
    queryFn: () => workspaceService.getInvites(workspaceId, filters),
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });
}
