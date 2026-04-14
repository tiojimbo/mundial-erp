import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNotification } from '@/hooks/use-notification';
import { productionService } from '../services/production.service';
import type {
  ProductionOrderFilters,
  StartProductionPayload,
  CompleteProductionPayload,
  RegisterConsumptionPayload,
  RegisterOutputPayload,
  RegisterLossPayload,
  SeparationOrderFilters,
} from '../types/production.types';

export const PRODUCTION_ORDERS_KEY = ['production-orders'];
export const SEPARATION_ORDERS_KEY = ['separation-orders'];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado. Tente novamente.';
}

// ===== Production Orders =====

export function useProductionOrders(filters?: ProductionOrderFilters) {
  return useQuery({
    queryKey: [...PRODUCTION_ORDERS_KEY, filters],
    queryFn: () => productionService.getAllProductionOrders(filters),
    placeholderData: (prev) => prev,
  });
}

export function useProductionOrder(id: string) {
  return useQuery({
    queryKey: [...PRODUCTION_ORDERS_KEY, id],
    queryFn: () => productionService.getProductionOrderById(id),
    enabled: !!id,
  });
}

export function useStartProduction(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload?: StartProductionPayload) =>
      productionService.startProductionOrder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: PRODUCTION_ORDERS_KEY });
      notification({
        title: 'Producao iniciada',
        description: 'Ordem de producao iniciada com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao iniciar producao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCompleteProduction(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload?: CompleteProductionPayload) =>
      productionService.completeProductionOrder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: PRODUCTION_ORDERS_KEY });
      notification({
        title: 'Producao concluida',
        description: 'Ordem de producao concluida com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao concluir producao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCancelProduction(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: () => productionService.cancelProductionOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: PRODUCTION_ORDERS_KEY });
      notification({
        title: 'Producao cancelada',
        description: 'Ordem de producao cancelada.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao cancelar producao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useRegisterConsumption(poId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: RegisterConsumptionPayload) =>
      productionService.registerConsumption(poId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, poId] });
      notification({
        title: 'Consumo registrado',
        description: 'Materia-prima registrada com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao registrar consumo',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useRegisterOutput(poId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: RegisterOutputPayload) =>
      productionService.registerOutput(poId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, poId] });
      notification({
        title: 'Produto acabado registrado',
        description: 'Saida de producao registrada com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao registrar saida',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useRegisterLoss(poId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: RegisterLossPayload) =>
      productionService.registerLoss(poId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRODUCTION_ORDERS_KEY, poId] });
      notification({
        title: 'Perda registrada',
        description: 'Perda de producao registrada.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao registrar perda',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

// ===== Separation Orders =====

export function useSeparationOrders(filters?: SeparationOrderFilters) {
  return useQuery({
    queryKey: [...SEPARATION_ORDERS_KEY, filters],
    queryFn: () => productionService.getAllSeparationOrders(filters),
    placeholderData: (prev) => prev,
  });
}

export function useSeparationOrder(id: string) {
  return useQuery({
    queryKey: [...SEPARATION_ORDERS_KEY, id],
    queryFn: () => productionService.getSeparationOrderById(id),
    enabled: !!id,
  });
}

export function useSeparateItem(soId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (itemId: string) =>
      productionService.separateItem(soId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...SEPARATION_ORDERS_KEY, soId] });
      notification({
        title: 'Item separado',
        description: 'Item marcado como separado.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao separar item',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCheckItem(soId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (itemId: string) =>
      productionService.checkItem(soId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...SEPARATION_ORDERS_KEY, soId] });
      notification({
        title: 'Item conferido',
        description: 'Item marcado como conferido.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao conferir item',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}
