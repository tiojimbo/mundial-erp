import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';

export function useSelectWorkspace() {
  const qc = useQueryClient();
  const router = useRouter();
  const setCurrentWorkspace = useWorkspaceStore(
    (s) => s.setCurrentWorkspace,
  );

  return useMutation({
    mutationFn: (workspaceId: string) => workspaceService.select(workspaceId),
    onSuccess: ({ accessToken, refreshToken, workspace }) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      setCurrentWorkspace(workspace);
      // qc.clear() em vez de invalidate — ADR-002 #1: zero leak cross-tenant.
      qc.clear();
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
      toast.success(`Workspace alterado para ${workspace.name}`);
      router.push('/inicio');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao trocar workspace');
    },
  });
}
