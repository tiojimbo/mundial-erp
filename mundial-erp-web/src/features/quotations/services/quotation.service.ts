import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  PurchaseQuotation,
  PurchaseQuotationSummary,
  PurchaseOrder,
  QuotationFilters,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  CreatePurchaseOrderPayload,
  QuotationTimelineEvent,
} from '../types/quotation.types';

export const quotationService = {
  async getAll(
    filters?: QuotationFilters,
  ): Promise<PaginatedResponse<PurchaseQuotationSummary>> {
    const { data } = await api.get<PaginatedResponse<PurchaseQuotationSummary>>(
      '/purchase-quotations',
      { params: filters },
    );
    return data;
  },

  async getById(id: string): Promise<PurchaseQuotation> {
    const { data } = await api.get<PurchaseQuotation>(
      `/purchase-quotations/${id}`,
    );
    return data;
  },

  async create(payload: CreateQuotationPayload): Promise<PurchaseQuotation> {
    const { data } = await api.post<PurchaseQuotation>(
      '/purchase-quotations',
      payload,
    );
    return data;
  },

  async update(
    id: string,
    payload: UpdateQuotationPayload,
  ): Promise<PurchaseQuotation> {
    const { data } = await api.patch<PurchaseQuotation>(
      `/purchase-quotations/${id}`,
      payload,
    );
    return data;
  },

  async select(id: string): Promise<PurchaseQuotation> {
    const { data } = await api.patch<PurchaseQuotation>(
      `/purchase-quotations/${id}/select`,
    );
    return data;
  },

  async getTimeline(id: string): Promise<QuotationTimelineEvent[]> {
    const { data } = await api.get<QuotationTimelineEvent[]>(
      `/purchase-quotations/${id}/timeline`,
    );
    return data;
  },

  async createPurchaseOrder(
    payload: CreatePurchaseOrderPayload,
  ): Promise<PurchaseOrder> {
    const { data } = await api.post<PurchaseOrder>(
      '/purchase-orders',
      payload,
    );
    return data;
  },

  async getPurchaseOrders(): Promise<PaginatedResponse<PurchaseOrder>> {
    const { data } = await api.get<PaginatedResponse<PurchaseOrder>>(
      '/purchase-orders',
    );
    return data;
  },

};
