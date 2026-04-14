import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  Supplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierFilters,
  SupplierPurchaseHistory,
} from '../types/supplier.types';

export const supplierService = {
  async getAll(filters?: SupplierFilters): Promise<PaginatedResponse<Supplier>> {
    const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers', {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<Supplier> {
    const { data } = await api.get<Supplier>(`/suppliers/${id}`);
    return data;
  },

  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/suppliers', payload);
    return data;
  },

  async update(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    const { data } = await api.patch<Supplier>(`/suppliers/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  },

  async getPurchaseHistory(id: string): Promise<SupplierPurchaseHistory[]> {
    const { data } = await api.get<SupplierPurchaseHistory[]>(
      `/suppliers/${id}/purchase-history`,
    );
    return data;
  },
};
