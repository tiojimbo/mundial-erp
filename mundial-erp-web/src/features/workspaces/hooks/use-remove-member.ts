import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeMember(workspaceId, userId),
    onSuccess: () => {
      toast.success('Membro removido!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'members'],
      });
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'seats'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover membro');
    },
  });
}
