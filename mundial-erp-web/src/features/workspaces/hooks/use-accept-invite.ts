import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';

export function useAcceptInvite() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (token: string) => workspaceService.acceptInvite(token),
    onSuccess: () => {
      toast.success('Convite aceito! Bem-vindo ao workspace.');
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
      router.push('/inicio');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao aceitar convite');
    },
  });
}
