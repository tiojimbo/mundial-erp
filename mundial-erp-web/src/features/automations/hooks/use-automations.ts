import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { automationsService } from '../services/automations.service';
import type {
  CreateAutomationPayload,
  UpdateAutomationPayload,
} from '../types/automation.types';

const AUTOMATIONS_KEY = ['automations'] as const;

export function useAutomations() {
  return useQuery({
    queryKey: AUTOMATIONS_KEY,
    queryFn: () => automationsService.list(),
    staleTime: 30_000,
  });
}

export function useAutomation(id: string | undefined) {
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, id] as const,
    queryFn: () => automationsService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAutomationTriggers() {
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, 'triggers'] as const,
    queryFn: () => automationsService.listTriggers(),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationActions() {
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, 'actions'] as const,
    queryFn: () => automationsService.listActions(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAutomationPayload) =>
      automationsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast.success('Automation criada');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao criar automation',
      );
    },
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAutomationPayload;
    }) => automationsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast.success('Automation atualizada');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao atualizar automation',
      );
    },
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast.success('Automation removida');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao remover automation',
      );
    },
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationsService.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao alternar status',
      );
    },
  });
}
