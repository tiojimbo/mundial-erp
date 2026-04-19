import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { WorkspaceRole } from '../types/workspace.types';

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      toast.success('Permissão atualizada!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'members'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar permissão');
    },
  });
}
