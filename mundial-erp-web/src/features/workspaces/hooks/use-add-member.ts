import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { BulkAddUsersPayload } from '../types/workspace.types';

export function useBulkAddUsers(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAddUsersPayload) =>
      workspaceService.bulkAddUsers(workspaceId, payload),
    onSuccess: (res) => {
      const sent = res.invited.length;
      const skipped = res.skipped.length;
      toast.success(
        skipped > 0
          ? `${sent} convidado(s), ${skipped} ja era(m) membro(s)`
          : `${sent} convidado(s)!`,
      );
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'users'],
      });
      qc.invalidateQueries({
        queryKey: [...WORKSPACES_KEY, workspaceId, 'seats'],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao adicionar usuarios');
    },
  });
}
