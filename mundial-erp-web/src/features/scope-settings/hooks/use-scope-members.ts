import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scopeSettingsService } from '../services/scope-settings.service';
import type { Permission, ScopeKind } from '../types/scope.types';

const membersKey = (scope: ScopeKind, id: string) =>
  [scope, id, 'members'] as const;

export function useScopeMembers(scope: ScopeKind, id: string) {
  return useQuery({
    queryKey: membersKey(scope, id),
    queryFn: () => scopeSettingsService.listMembers(scope, id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAddScopeMember(scope: ScopeKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: string;
      permission: Permission;
    }) => scopeSettingsService.addMember(scope, id, userId, permission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(scope, id) });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao adicionar membro',
      );
    },
  });
}

export function useUpdateScopeMember(scope: ScopeKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: string;
      permission: Permission;
    }) => scopeSettingsService.updateMember(scope, id, userId, permission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(scope, id) });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao atualizar permissao',
      );
    },
  });
}

export function useRemoveScopeMember(scope: ScopeKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      scopeSettingsService.removeMember(scope, id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(scope, id) });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao remover membro',
      );
    },
  });
}
