import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/use-notification';
import { quotationService } from '../services/quotation.service';
import type {
  QuotationFilters,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  CreatePurchaseOrderPayload,
} from '../types/quotation.types';

export const QUOTATIONS_KEY = ['purchase-quotations'];
export const PURCHASE_ORDERS_KEY = ['purchase-orders'];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado. Tente novamente.';
}

export function useQuotations(filters?: QuotationFilters) {
  return useQuery({
    queryKey: [...QUOTATIONS_KEY, filters],
    queryFn: () => quotationService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: [...QUOTATIONS_KEY, id],
    queryFn: () => quotationService.getById(id),
    enabled: !!id,
  });
}

export function useQuotationTimeline(id: string) {
  return useQuery({
    queryKey: [...QUOTATIONS_KEY, id, 'timeline'],
    queryFn: () => quotationService.getTimeline(id),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const router = useRouter();
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: CreateQuotationPayload) =>
      quotationService.create(payload),
    onSuccess: (quotation) => {
      qc.invalidateQueries({ queryKey: QUOTATIONS_KEY });
      notification({
        title: 'Cotação criada',
        description: 'Cotação criada com sucesso.',
        status: 'success',
      });
      router.push(`/compras/cotacoes/${quotation.id}`);
    },
    onError: (error) => {
      notification({
        title: 'Erro ao criar cotação',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useUpdateQuotation(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: UpdateQuotationPayload) =>
      quotationService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QUOTATIONS_KEY, id] });
      qc.invalidateQueries({ queryKey: QUOTATIONS_KEY });
      notification({
        title: 'Cotação atualizada',
        description: 'Alterações salvas com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao atualizar cotação',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useSelectQuotation(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: () => quotationService.select(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QUOTATIONS_KEY, id] });
      qc.invalidateQueries({ queryKey: QUOTATIONS_KEY });
      notification({
        title: 'Cotação selecionada',
        description: 'Cotação marcada como selecionada.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao selecionar cotação',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) =>
      quotationService.createPurchaseOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUOTATIONS_KEY });
      qc.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      notification({
        title: 'Compra efetivada',
        description: 'Ordem de compra criada com sucesso. Conta a pagar gerada automaticamente.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao efetivar compra',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}
