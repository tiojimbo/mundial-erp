import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  StockRequisition,
  StockRequisitionSummary,
  RequisitionFilters,
  CreateRequisitionPayload,
  ProcessItemPayload,
} from '../types/stock-requisition.types';

export const stockRequisitionService = {
  async getAll(
    filters?: RequisitionFilters,
  ): Promise<PaginatedResponse<StockRequisitionSummary>> {
    const { data } = await api.get<PaginatedResponse<StockRequisitionSummary>>(
      '/stock-requisitions',
      { params: filters },
    );
    return data;
  },

  async getById(id: string): Promise<StockRequisition> {
    const { data } = await api.get<ApiResponse<StockRequisition>>(
      `/stock-requisitions/${id}`,
    );
    return data.data;
  },

  async getByCode(code: string): Promise<StockRequisition> {
    const { data } = await api.get<ApiResponse<StockRequisition>>(
      `/stock-requisitions/code/${encodeURIComponent(code)}`,
    );
    return data.data;
  },

  async create(payload: CreateRequisitionPayload): Promise<StockRequisition> {
    const { data } = await api.post<ApiResponse<StockRequisition>>(
      '/stock-requisitions',
      payload,
    );
    return data.data;
  },

  async approve(id: string): Promise<StockRequisition> {
    const { data } = await api.patch<ApiResponse<StockRequisition>>(
      `/stock-requisitions/${id}/approve`,
    );
    return data.data;
  },

  async processItem(
    requisitionId: string,
    itemId: string,
    payload: ProcessItemPayload,
  ): Promise<StockRequisition> {
    const { data } = await api.patch<ApiResponse<StockRequisition>>(
      `/stock-requisitions/${requisitionId}/items/${itemId}/process`,
      payload,
    );
    return data.data;
  },

  async complete(id: string): Promise<StockRequisition> {
    const { data } = await api.patch<ApiResponse<StockRequisition>>(
      `/stock-requisitions/${id}/complete`,
    );
    return data.data;
  },

  async cancel(id: string): Promise<void> {
    await api.delete(`/stock-requisitions/${id}`);
  },

  async downloadPdf(id: string): Promise<void> {
    const { data } = await api.get(`/stock-requisitions/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requisicao-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
