import { api } from '@/lib/api';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type {
  PriceTable,
  CreatePriceTablePayload,
  UpdatePriceTablePayload,
  PriceTableItem,
  CreatePriceTableItemPayload,
} from '../types/price-table.types';

export const priceTableService = {
  async getAll(): Promise<PriceTable[]> {
    const { data } = await api.get<PaginatedResponse<PriceTable>>(
      '/price-tables',
      { params: { limit: 100 } },
    );
    return data.data;
  },

  async getById(id: string): Promise<PriceTable> {
    const { data } = await api.get<ApiResponse<PriceTable>>(
      `/price-tables/${id}`,
    );
    return data.data;
  },

  async create(payload: CreatePriceTablePayload): Promise<PriceTable> {
    const { data } = await api.post<ApiResponse<PriceTable>>(
      '/price-tables',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdatePriceTablePayload,
  ): Promise<PriceTable> {
    const { data } = await api.patch<ApiResponse<PriceTable>>(
      `/price-tables/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/price-tables/${id}`);
  },

  async addItem(
    tableId: string,
    payload: CreatePriceTableItemPayload,
  ): Promise<PriceTableItem> {
    const { data } = await api.post<ApiResponse<PriceTableItem>>(
      `/price-tables/${tableId}/items`,
      payload,
    );
    return data.data;
  },

  async updateItem(
    tableId: string,
    itemId: string,
    priceInCents: number,
  ): Promise<PriceTableItem> {
    const { data } = await api.patch<ApiResponse<PriceTableItem>>(
      `/price-tables/${tableId}/items/${itemId}`,
      { priceInCents },
    );
    return data.data;
  },

  async removeItem(tableId: string, itemId: string): Promise<void> {
    await api.delete(`/price-tables/${tableId}/items/${itemId}`);
  },

  async bulkUpdateItems(
    tableId: string,
    items: { itemId: string; priceInCents: number }[],
  ): Promise<void> {
    await Promise.all(
      items.map(({ itemId, priceInCents }) =>
        api.patch(`/price-tables/${tableId}/items/${itemId}`, { priceInCents }),
      ),
    );
  },
};
