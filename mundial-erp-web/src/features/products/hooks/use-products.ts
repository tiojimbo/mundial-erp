import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notification } from '@/hooks/use-notification';
import { productService } from '../services/product.service';
import type {
  ProductFilters,
  CreateProductPayload,
  UpdateProductPayload,
} from '../types/product.types';

export const PRODUCTS_KEY = ['products'];

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, filters],
    queryFn: () => productService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}

export function useProductFormula(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id, 'formula'],
    queryFn: () => productService.getFormula(id),
    enabled: !!id,
  });
}

export function useProductStockMovements(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id, 'stock-movements'],
    queryFn: () => productService.getStockMovements(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      productService.create(payload),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notification({
        status: 'success',
        title: 'Produto cadastrado',
        description: 'O produto foi criado com sucesso.',
      });
      router.push(`/compras/produtos/${product.id}`);
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao cadastrar',
        description: error.message || 'Não foi possível criar o produto.',
      });
    },
  });
}

export function useUpdateProduct(id: string) {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProductPayload) =>
      productService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notification({
        status: 'success',
        title: 'Produto atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
      router.push(`/compras/produtos/${id}`);
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o produto.',
      });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notification({
        status: 'success',
        title: 'Produto excluído',
        description: 'O produto foi removido com sucesso.',
      });
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o produto.',
      });
    },
  });
}

export function useProductTypes() {
  return useQuery({
    queryKey: ['product-types'],
    queryFn: () => productService.getProductTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNextProductCode(typeId: string) {
  return useQuery({
    queryKey: ['product-next-code', typeId],
    queryFn: () => productService.getNextCode(typeId),
    enabled: !!typeId,
  });
}

export function useUnitMeasures() {
  return useQuery({
    queryKey: ['unit-measures'],
    queryFn: () => productService.getUnitMeasures(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => productService.getBrands(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductDepartments() {
  return useQuery({
    queryKey: ['product-departments'],
    queryFn: () => productService.getDepartments(),
    staleTime: 5 * 60 * 1000,
  });
}
