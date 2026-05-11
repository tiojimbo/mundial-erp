import { useQuery } from '@tanstack/react-query';
import { scopeSettingsService } from '../services/scope-settings.service';
import type { ScopeKind } from '../types/scope.types';

export function useScopeResources(scope: ScopeKind, id: string) {
  return useQuery({
    queryKey: [scope, id, 'resources'] as const,
    queryFn: () => scopeSettingsService.getResources(scope, id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}
