import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STALE_5MIN = 5 * 60 * 1000;

type LookupItem = {
  id: string;
  name: string;
};

type ProductLookup = {
  id: string;
  name: string;
  code: string;
};

export function useSupplierLookup() {
  return useQuery({
    queryKey: ['lookup', 'suppliers'],
    queryFn: async (): Promise<LookupItem[]> => {
      const { data } = await api.get<{ data: LookupItem[] }>('/suppliers', {
        params: { limit: 100 },
      });
      return data.data ?? (data as unknown as LookupItem[]);
    },
    staleTime: STALE_5MIN,
  });
}

export function useProductLookup() {
  return useQuery({
    queryKey: ['lookup', 'products'],
    queryFn: async (): Promise<ProductLookup[]> => {
      const { data } = await api.get<{ data: ProductLookup[] }>('/products', {
        params: { limit: 100 },
      });
      return data.data ?? (data as unknown as ProductLookup[]);
    },
    staleTime: STALE_5MIN,
  });
}
