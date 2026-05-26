import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiTokenService } from '../services/api-token.service';
import type { CreateApiTokenPayload } from '../types/api-token.types';

export const API_TOKENS_KEY = ['personal-access-tokens'];

export function useApiTokens() {
  return useQuery({
    queryKey: API_TOKENS_KEY,
    queryFn: apiTokenService.list,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApiTokenPayload) =>
      apiTokenService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_TOKENS_KEY });
    },
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiTokenService.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_TOKENS_KEY });
    },
  });
}
