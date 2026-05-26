import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  ApiToken,
  ApiTokenCreated,
  CreateApiTokenPayload,
} from '../types/api-token.types';

export const apiTokenService = {
  async list(): Promise<ApiToken[]> {
    const { data } = await api.get<ApiResponse<ApiToken[]>>('/api-keys');
    return data.data;
  },

  async create(payload: CreateApiTokenPayload): Promise<ApiTokenCreated> {
    const { data } = await api.post<ApiResponse<ApiTokenCreated>>(
      '/api-keys',
      payload,
    );
    return data.data;
  },

  async revoke(id: string): Promise<void> {
    await api.delete(`/api-keys/${id}`);
  },
};
