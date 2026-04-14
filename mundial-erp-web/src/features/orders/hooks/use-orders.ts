import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/use-notification';
import { orderService } from '../services/order.service';
import type {
  OrderFilters,
  CreateOrderPayload,
  UpdateOrderPayload,
  ChangeStatusPayload,
  RegisterPaymentPayload,
  OrderStatus,
} from '../types/order.types';

export const ORDERS_KEY = ['orders'];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado. Tente novamente.';
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: [...ORDERS_KEY, filters],
    queryFn: () => orderService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [...ORDERS_KEY, id],
    queryFn: () => orderService.getById(id),
    enabled: !!id,
  });
}

export function useOrderTimeline(id: string) {
  return useQuery({
    queryKey: [...ORDERS_KEY, id, 'timeline'],
    queryFn: () => orderService.getTimeline(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const router = useRouter();
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      orderService.create(payload),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      notification({
        title: 'Pedido criado',
        description: `Pedido #${order.orderNumber} criado com sucesso.`,
        status: 'success',
      });
      router.push(`/comercial/pedidos/${order.id}`);
    },
    onError: (error) => {
      notification({
        title: 'Erro ao criar pedido',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useUpdateOrder(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: UpdateOrderPayload) =>
      orderService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      notification({
        title: 'Pedido atualizado',
        description: 'Alteracoes salvas com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao atualizar pedido',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useChangeOrderStatus(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: ({
      newStatus,
      payload,
    }: {
      newStatus: OrderStatus;
      payload?: ChangeStatusPayload;
    }) => orderService.changeStatus(id, newStatus, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      notification({
        title: 'Status atualizado',
        description: 'Status do pedido alterado com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao alterar status',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useToggleSupply(orderId: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: ({
      itemId,
      supplyId,
      status,
    }: {
      itemId: string;
      supplyId: string;
      status: 'PENDING' | 'READY';
    }) => orderService.toggleSupplyStatus(orderId, itemId, supplyId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, orderId] });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao atualizar insumo',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}

export function useRegisterPayment(id: string) {
  const qc = useQueryClient();
  const { notification } = useNotification();
  return useMutation({
    mutationFn: (payload: RegisterPaymentPayload) =>
      orderService.registerPayment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ORDERS_KEY, id] });
      notification({
        title: 'Pagamento registrado',
        description: 'Pagamento registrado com sucesso.',
        status: 'success',
      });
    },
    onError: (error) => {
      notification({
        title: 'Erro ao registrar pagamento',
        description: extractErrorMessage(error),
        status: 'error',
      });
    },
  });
}
