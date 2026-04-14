import { api } from '@/lib/api';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductFilters,
  ProductType,
  UnitMeasure,
  Brand,
  ProductDepartment,
  ProductFormula,
  StockMovement,
} from '../types/product.types';

export const productService = {
  async getAll(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const { data } = await api.get<PaginatedResponse<Product>>('/products', {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return data.data;
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const { data } = await api.post<ApiResponse<Product>>('/products', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    const { data } = await api.patch<ApiResponse<Product>>(`/products/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async getFormula(id: string): Promise<ProductFormula> {
    const { data } = await api.get<ApiResponse<ProductFormula>>(
      `/products/${id}/formula`,
    );
    return data.data;
  },

  async getStockMovements(id: string): Promise<StockMovement[]> {
    const { data } = await api.get<ApiResponse<StockMovement[]>>(
      `/products/${id}/stock-movements`,
    );
    return data.data;
  },

  async getByBarcode(ean: string): Promise<Product> {
    const { data } = await api.get<ApiResponse<Product>>(
      `/products/barcode/${ean}`,
    );
    return data.data;
  },

  async getProductTypes(): Promise<ProductType[]> {
    const { data } = await api.get<PaginatedResponse<ProductType>>(
      '/product-types',
      { params: { limit: 100 } },
    );
    return data.data;
  },

  async getNextCode(typeId: string): Promise<{ code: string; barcode: string }> {
    const { data } = await api.get<ApiResponse<{ code: string; barcode: string }>>(
      `/product-types/${typeId}/next-code`,
    );
    return data.data;
  },

  async getUnitMeasures(): Promise<UnitMeasure[]> {
    const { data } = await api.get<PaginatedResponse<UnitMeasure>>(
      '/unit-measures',
      { params: { limit: 100 } },
    );
    return data.data;
  },

  async getBrands(): Promise<Brand[]> {
    const { data } = await api.get<PaginatedResponse<Brand>>(
      '/brands',
      { params: { limit: 100 } },
    );
    return data.data;
  },

  async getDepartments(): Promise<ProductDepartment[]> {
    const { data } = await api.get<PaginatedResponse<ProductDepartment>>(
      '/product-departments',
      { params: { limit: 100 } },
    );
    return data.data;
  },
};
