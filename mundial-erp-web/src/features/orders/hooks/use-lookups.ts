import { useQuery } from '@tanstack/react-query';
import { lookupService } from '../services/lookup.service';

const STALE_5MIN = 5 * 60 * 1000;

export function useClientLookup() {
  return useQuery({
    queryKey: ['lookup', 'clients'],
    queryFn: () => lookupService.getClients(),
    staleTime: STALE_5MIN,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['lookup', 'payment-methods'],
    queryFn: () => lookupService.getPaymentMethods(),
    staleTime: STALE_5MIN,
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: ['lookup', 'carriers'],
    queryFn: () => lookupService.getCarriers(),
    staleTime: STALE_5MIN,
  });
}

export function usePriceTables() {
  return useQuery({
    queryKey: ['lookup', 'price-tables'],
    queryFn: () => lookupService.getPriceTables(),
    staleTime: STALE_5MIN,
  });
}

export function useProductLookup() {
  return useQuery({
    queryKey: ['lookup', 'products'],
    queryFn: () => lookupService.getProducts(),
    staleTime: STALE_5MIN,
  });
}
