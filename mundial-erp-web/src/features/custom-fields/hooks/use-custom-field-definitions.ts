import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { customFieldDefinitionsService } from '../services/custom-field-definitions.service';
import type { CustomFieldDefinitionsListParams } from '../types/custom-field.types';

/**
 * `queryKey` estavel: `[workspaceId, 'custom-field-definitions', params]`.
 *
 * Workspace prefix garante isolamento de cache entre tenants (mesmo padrao
 * adotado em `taskQueryKeys`). Stale 30s alinhado com PLANO §"Hooks".
 */
export const customFieldDefinitionsQueryKeys = {
  all: (workspaceId: string) =>
    [workspaceId, 'custom-field-definitions'] as const,
  list: (workspaceId: string, params?: CustomFieldDefinitionsListParams) =>
    [
      ...customFieldDefinitionsQueryKeys.all(workspaceId),
      'list',
      params ?? {},
    ] as const,
};

export const CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS = 30_000;

export function useCustomFieldDefinitions(
  params?: CustomFieldDefinitionsListParams,
) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useQuery({
    queryKey: customFieldDefinitionsQueryKeys.list(workspaceId, params),
    queryFn: () => customFieldDefinitionsService.list(params),
    enabled: Boolean(workspaceId),
    staleTime: CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS,
  });
}
