import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  ProductionOrder,
  ProductionOrderSummary,
  ProductionOrderFilters,
  StartProductionPayload,
  CompleteProductionPayload,
  RegisterConsumptionPayload,
  RegisterOutputPayload,
  RegisterLossPayload,
  SeparationOrder,
  SeparationOrderSummary,
  SeparationOrderFilters,
} from '../types/production.types';

export const productionService = {
  // ===== Production Orders =====

  async getAllProductionOrders(
    filters?: ProductionOrderFilters,
  ): Promise<PaginatedResponse<ProductionOrderSummary>> {
    const { data } = await api.get<PaginatedResponse<ProductionOrderSummary>>(
      '/production-orders',
      { params: filters },
    );
    return data;
  },

  async getProductionOrderById(id: string): Promise<ProductionOrder> {
    const { data } = await api.get<ProductionOrder>(`/production-orders/${id}`);
    return data;
  },

  async startProductionOrder(
    id: string,
    payload?: StartProductionPayload,
  ): Promise<ProductionOrder> {
    const { data } = await api.patch<ProductionOrder>(
      `/production-orders/${id}/start`,
      payload,
    );
    return data;
  },

  async completeProductionOrder(
    id: string,
    payload?: CompleteProductionPayload,
  ): Promise<ProductionOrder> {
    const { data } = await api.patch<ProductionOrder>(
      `/production-orders/${id}/complete`,
      payload,
    );
    return data;
  },

  async cancelProductionOrder(id: string): Promise<ProductionOrder> {
    const { data } = await api.patch<ProductionOrder>(
      `/production-orders/${id}/cancel`,
    );
    return data;
  },

  // ===== Consumptions =====

  async registerConsumption(
    poId: string,
    payload: RegisterConsumptionPayload,
  ): Promise<void> {
    await api.post(`/production-orders/${poId}/consumptions`, payload);
  },

  // ===== Outputs =====

  async registerOutput(
    poId: string,
    payload: RegisterOutputPayload,
  ): Promise<void> {
    await api.post(`/production-orders/${poId}/outputs`, payload);
  },

  // ===== Losses =====

  async registerLoss(
    poId: string,
    payload: RegisterLossPayload,
  ): Promise<void> {
    await api.post(`/production-orders/${poId}/losses`, payload);
  },

  // ===== PDF =====

  getProductionOrderPdfUrl(poId: string): string {
    return `${api.defaults.baseURL}/production-orders/${poId}/pdf`;
  },

  // ===== Separation Orders =====

  async getAllSeparationOrders(
    filters?: SeparationOrderFilters,
  ): Promise<PaginatedResponse<SeparationOrderSummary>> {
    const { data } = await api.get<PaginatedResponse<SeparationOrderSummary>>(
      '/separation-orders',
      { params: filters },
    );
    return data;
  },

  async getSeparationOrderById(id: string): Promise<SeparationOrder> {
    const { data } = await api.get<SeparationOrder>(`/separation-orders/${id}`);
    return data;
  },

  async separateItem(soId: string, itemId: string): Promise<void> {
    await api.patch(`/separation-orders/${soId}/items/${itemId}/separate`);
  },

  async checkItem(soId: string, itemId: string): Promise<void> {
    await api.patch(`/separation-orders/${soId}/items/${itemId}/check`);
  },
};
