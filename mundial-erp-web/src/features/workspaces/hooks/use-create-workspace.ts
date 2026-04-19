import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspace.service';
import { WORKSPACES_KEY } from './use-workspaces';
import type { CreateWorkspacePayload } from '../types/workspace.types';

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) =>
      workspaceService.create(payload),
    onSuccess: () => {
      toast.success('Workspace criado com sucesso!');
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar workspace');
    },
  });
}

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateWorkspacePayload>) =>
      workspaceService.update(id, payload),
    onSuccess: () => {
      toast.success('Workspace atualizado!');
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
      qc.invalidateQueries({ queryKey: [...WORKSPACES_KEY, id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar workspace');
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceService.remove(id),
    onSuccess: () => {
      toast.success('Workspace removido!');
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover workspace');
    },
  });
}
