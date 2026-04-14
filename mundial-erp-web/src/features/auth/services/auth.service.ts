import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  LoginPayload,
  LoginResponse,
  User,
} from '@/types/auth.types';

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  async me(): Promise<User> {
    // API returns envelope: { data: User, meta: {...} }
    // Axios unwraps response.data → we get the envelope → .data extracts User
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/auth/logout', { refreshToken });
  },
};
