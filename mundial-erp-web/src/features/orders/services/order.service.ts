import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  Order,
  OrderSummary,
  OrderFilters,
  CreateOrderPayload,
  UpdateOrderPayload,
  ChangeStatusPayload,
  RegisterPaymentPayload,
  OrderStatus,
  TimelineEvent,
} from '../types/order.types';

export const orderService = {
  async getAll(filters?: OrderFilters): Promise<PaginatedResponse<OrderSummary>> {
    const { data } = await api.get<PaginatedResponse<OrderSummary>>('/orders', {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<Order> {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },

  async create(payload: CreateOrderPayload): Promise<Order> {
    const { data } = await api.post<Order>('/orders', payload);
    return data;
  },

  async update(id: string, payload: UpdateOrderPayload): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}`, payload);
    return data;
  },

  async changeStatus(
    id: string,
    newStatus: OrderStatus,
    payload?: ChangeStatusPayload,
  ): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}/status`, {
      status: newStatus,
      ...payload,
    });
    return data;
  },

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    const { data } = await api.get<TimelineEvent[]>(`/orders/${id}/timeline`);
    return data;
  },

  async toggleSupplyStatus(
    orderId: string,
    itemId: string,
    supplyId: string,
    status: 'PENDING' | 'READY',
  ): Promise<void> {
    await api.patch(`/orders/${orderId}/items/${itemId}/supplies/${supplyId}`, {
      status,
    });
  },

  async addSupply(
    orderId: string,
    itemId: string,
    payload: { productId?: string; name: string; quantity?: number },
  ): Promise<void> {
    await api.post(`/orders/${orderId}/items/${itemId}/supplies`, payload);
  },

  async registerPayment(id: string, payload: RegisterPaymentPayload): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}/payment`, payload);
    return data;
  },

  getPdfUrl(id: string): string {
    return `${api.defaults.baseURL}/orders/${id}/pdf`;
  },

  getProductionOrderPdfUrl(poId: string): string {
    return `${api.defaults.baseURL}/production-orders/${poId}/pdf`;
  },
};
