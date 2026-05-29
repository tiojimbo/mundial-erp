import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { WorkspaceRole } from '../types/workspace.types';

export function useSetUserPermission(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: string;
      permission: WorkspaceRole;
    }) => workspaceService.setUserPermission(workspaceId, userId, permission),
    onSuccess: () => {
      toast.success('Funcao atualizada!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'users'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar funcao');
    },
  });
}
