import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scopeSettingsService } from '../services/scope-settings.service';
import type { ScopeKind, Visibility } from '../types/scope.types';

const visibilityKey = (scope: ScopeKind, id: string) =>
  [scope, id, 'visibility'] as const;

export function useScopeVisibility(scope: ScopeKind, id: string) {
  return useQuery({
    queryKey: visibilityKey(scope, id),
    queryFn: () => scopeSettingsService.getVisibility(scope, id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSetScopeVisibility(scope: ScopeKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visibility: Visibility) =>
      scopeSettingsService.setVisibility(scope, id, visibility),
    onSuccess: (data) => {
      qc.setQueryData(visibilityKey(scope, id), data);
      qc.invalidateQueries({ queryKey: [scope, id, 'members'] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao alterar visibilidade',
      );
    },
  });
}
