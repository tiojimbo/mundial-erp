import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { companyService } from '../services/company.service';
import type { UpdateCompanyPayload } from '../types/settings.types';

export const COMPANY_KEY = ['company'];

export function useCompany() {
  return useQuery({
    queryKey: COMPANY_KEY,
    queryFn: () => companyService.get(),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyPayload) => companyService.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEY });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => companyService.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEY });
    },
  });
}
