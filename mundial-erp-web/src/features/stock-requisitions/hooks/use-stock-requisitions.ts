import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/use-notification';
import { stockRequisitionService } from '../services/stock-requisition.service';
import type {
  RequisitionFilters,
  CreateRequisitionPayload,
  ProcessItemPayload,
} from '../types/stock-requisition.types';

export const REQUISITIONS_KEY = ['stock-requisitions'];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado. Tente novamente.';
}

export function useStockRequisitions(filters?: RequisitionFilters) {
  return useQuery({
    queryKey: [...REQUISITIONS_KEY, filters],
    queryFn: () => stockRequisitionService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useStockRequisition(id: string) {
  return useQuery({
    queryKey: [...REQUISITIONS_KEY, id],
    queryFn: () => stockRequisitionService.getById(id),
    enabled: !!id,
  });
}

export function useStockRequisitionByCode(code: string) {
  return useQuery({
    queryKey: [...REQUISITIONS_KEY, 'code', code],
    queryFn: () => stockRequisitionService.getByCode(code),
    enabled: !!code,
  });
}

export function useCreateRequisition() {
  const router = useRouter();
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: CreateRequisitionPayload) =>
      stockRequisitionService.create(payload),
    onSuccess: (requisition) => {
      qc.invalidateQueries({ queryKey: REQUISITIONS_KEY });
      notification({
        title: 'Requisicao criada',
        description: `Requisicao ${requisition.code} criada com sucesso.`,
        status: 'success',
      });
      router.push(`/compras/requisicoes/${requisition.id}`);
    },
    onError: (error) => {
      notification({
        title: 'Erro ao criar requisicao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useApproveRequisition(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: () => stockRequisitionService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...REQUISITIONS_KEY, id] });
      qc.invalidateQueries({ queryKey: REQUISITIONS_KEY });
      notification({
        title: 'Requisicao aprovada',
        description: 'Requisicao aprovada com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao aprovar requisicao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useProcessRequisitionItem(requisitionId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: ProcessItemPayload;
    }) => stockRequisitionService.processItem(requisitionId, itemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...REQUISITIONS_KEY, requisitionId] });
      notification({
        title: 'Item processado',
        description: 'Item da requisicao processado com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao processar item',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCompleteRequisition(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: () => stockRequisitionService.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...REQUISITIONS_KEY, id] });
      qc.invalidateQueries({ queryKey: REQUISITIONS_KEY });
      notification({
        title: 'Requisicao finalizada',
        description: 'Todos os itens processados. Requisicao concluida.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao finalizar requisicao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCancelRequisition(id: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: () => stockRequisitionService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITIONS_KEY });
      notification({
        title: 'Requisicao cancelada',
        description: 'Requisicao cancelada com sucesso.',
        status: 'success',
      });
      router.push('/compras/requisicoes');
    },
    onError: (error) => {
      notification({
        title: 'Erro ao cancelar requisicao',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useDeleteRequisition() {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (id: string) => stockRequisitionService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITIONS_KEY });
      notification({
        title: 'Requisição excluída',
        description: 'Requisição removida com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao excluir requisição',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}
