import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clientService } from '../services/client.service';
import type {
  ClientFilters,
  CreateClientPayload,
  UpdateClientPayload,
} from '../types/client.types';

export const CLIENTS_KEY = ['clients'];

export function useClients(filters?: ClientFilters) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, filters],
    queryFn: () => clientService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, id],
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}

export function useClientOrders(id: string) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, id, 'orders'],
    queryFn: () => clientService.getOrders(id),
    enabled: !!id,
  });
}

export function useClientFinancials(id: string) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, id, 'financials'],
    queryFn: () => clientService.getFinancials(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientPayload) =>
      clientService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
      router.push('/comercial/clientes');
    },
  });
}

export function useUpdateClient(id: string) {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateClientPayload) =>
      clientService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
      router.push(`/comercial/clientes/${id}`);
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
  });
}

export function useClientClassifications() {
  return useQuery({
    queryKey: ['client-classifications'],
    queryFn: () => clientService.getClassifications(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeliveryRoutes() {
  return useQuery({
    queryKey: ['delivery-routes'],
    queryFn: () => clientService.getDeliveryRoutes(),
    staleTime: 5 * 60 * 1000,
  });
}
