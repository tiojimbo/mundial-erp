import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { workspaceService } from '../services/workspace.service';
import type { WorkspaceFilters } from '../types/workspace.types';

export const WORKSPACES_KEY = ['workspaces'] as const;

export function useWorkspaces(filters?: WorkspaceFilters) {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  return useQuery({
    // JSON.stringify estabiliza a key — `{}` e `undefined` resolvem igual.
    queryKey: [...WORKSPACES_KEY, JSON.stringify(filters ?? {})],
    queryFn: () => workspaceService.list(filters),
    placeholderData: (prev) => prev,
    enabled: isAuthenticated,
  });
}

export function useWorkspace(id: string) {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: [...WORKSPACES_KEY, id],
    queryFn: () => workspaceService.getById(id),
    enabled: !!id && isAuthenticated,
  });
}
