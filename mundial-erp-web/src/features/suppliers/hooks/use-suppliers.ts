import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { supplierService } from '../services/supplier.service';
import type {
  SupplierFilters,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '../types/supplier.types';

export const SUPPLIERS_KEY = ['suppliers'];

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, filters],
    queryFn: () => supplierService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, id],
    queryFn: () => supplierService.getById(id),
    enabled: !!id,
  });
}

export function useSupplierPurchaseHistory(id: string) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, id, 'purchase-history'],
    queryFn: () => supplierService.getPurchaseHistory(id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) =>
      supplierService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY });
      router.push('/compras/fornecedores');
    },
  });
}

export function useUpdateSupplier(id: string) {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSupplierPayload) =>
      supplierService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY });
      router.push(`/compras/fornecedores/${id}`);
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supplierService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });
}
