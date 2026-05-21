'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { CnpjLookupResult } from '../types/custom-field.types';

export function useCnpjLookup() {
  return useMutation<CnpjLookupResult, Error, string>({
    mutationKey: ['cnpj-lookup'],
    mutationFn: async (cnpj: string) => {
      const digits = cnpj.replace(/\D/g, '');
      const { data } = await api.get<ApiResponse<CnpjLookupResult>>(
        `/custom-fields/cnpj-lookup/${digits}`,
      );
      return data.data;
    },
    onError: (err) => {
      toast.error(err.message || 'Não foi possível consultar o CNPJ');
    },
  });
}
