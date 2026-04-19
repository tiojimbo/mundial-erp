import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { AddMemberPayload } from '../types/workspace.types';

export function useAddMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddMemberPayload) =>
      workspaceService.addMember(workspaceId, payload),
    onSuccess: () => {
      toast.success('Membro adicionado!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'members'],
      });
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'seats'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao adicionar membro');
    },
  });
}
