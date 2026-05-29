import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';

export function useRemoveUser(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeUser(workspaceId, userId),
    onSuccess: () => {
      toast.success('Usuario removido!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'users'],
      });
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'seats'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover usuario');
    },
  });
}
