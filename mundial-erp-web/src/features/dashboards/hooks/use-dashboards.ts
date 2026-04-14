import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { dashboardService } from '../services/dashboard.service';
import type {
  DashboardFilters,
  CreateDashboardPayload,
  UpdateDashboardPayload,
  CreateCardPayload,
  UpdateCardPayload,
  BatchLayoutPayload,
  CreateFilterPayload,
} from '../types/dashboard.types';

// ===== Query Keys =====

export const DASHBOARDS_KEY = ['dashboards'];

// ===== Dashboards =====

export function useDashboards(filters?: DashboardFilters) {
  return useQuery({
    queryKey: [...DASHBOARDS_KEY, filters],
    queryFn: () => dashboardService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: [...DASHBOARDS_KEY, id],
    queryFn: () => dashboardService.getById(id),
    enabled: !!id,
  });
}

export function useCreateDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDashboardPayload) =>
      dashboardService.create(payload),
    onSuccess: (dashboard) => {
      toast.success('Painel criado com sucesso!');
      qc.invalidateQueries({ queryKey: DASHBOARDS_KEY });
      router.push(`/paineis/${dashboard.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar painel');
    },
  });
}

export function useUpdateDashboard(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDashboardPayload) =>
      dashboardService.update(id, payload),
    onSuccess: () => {
      toast.success('Painel atualizado!');
      qc.invalidateQueries({ queryKey: DASHBOARDS_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar painel');
    },
  });
}

export function useDeleteDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dashboardService.remove(id),
    onSuccess: () => {
      toast.success('Painel removido!');
      qc.invalidateQueries({ queryKey: DASHBOARDS_KEY });
      router.push('/paineis');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover painel');
    },
  });
}

// ===== Cards =====

export function useCardData(dashboardId: string, cardId: string, globalFilters?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...DASHBOARDS_KEY, dashboardId, 'cards', cardId, 'data', globalFilters],
    queryFn: () => dashboardService.getCardData(dashboardId, cardId, globalFilters),
    enabled: !!dashboardId && !!cardId,
    refetchInterval: undefined,
  });
}

export function useAddCard(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCardPayload) =>
      dashboardService.addCard(dashboardId, payload),
    onSuccess: () => {
      toast.success('Card adicionado!');
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao adicionar card');
    },
  });
}

export function useUpdateCard(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, ...payload }: UpdateCardPayload & { cardId: string }) =>
      dashboardService.updateCard(dashboardId, cardId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
  });
}

export function useRemoveCard(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      dashboardService.removeCard(dashboardId, cardId),
    onSuccess: () => {
      toast.success('Card removido!');
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
  });
}

export function useUpdateLayout(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BatchLayoutPayload) =>
      dashboardService.updateLayout(dashboardId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
  });
}

// ===== Filters =====

export function useAddFilter(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFilterPayload) =>
      dashboardService.addFilter(dashboardId, payload),
    onSuccess: () => {
      toast.success('Filtro adicionado!');
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
  });
}

export function useRemoveFilter(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filterId: string) =>
      dashboardService.removeFilter(dashboardId, filterId),
    onSuccess: () => {
      toast.success('Filtro removido!');
      qc.invalidateQueries({ queryKey: [...DASHBOARDS_KEY, dashboardId] });
    },
  });
}
