import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { CreateInvitePayload } from '../types/workspace.types';

export function useCreateInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvitePayload) =>
      workspaceService.createInvite(workspaceId, payload),
    onSuccess: () => {
      toast.success('Convite enviado!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'invites'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao enviar convite');
    },
  });
}

export function useRevokeInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      workspaceService.revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      toast.success('Convite revogado!');
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'invites'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao revogar convite');
    },
  });
}
