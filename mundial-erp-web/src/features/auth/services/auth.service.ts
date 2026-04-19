import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  LoginPayload,
  LoginResponse,
  LoginWorkspace,
  User,
} from '@/types/auth.types';

export type MeResponse = {
  user: User;
  workspace: LoginWorkspace | null;
  availableWorkspaces: LoginWorkspace[];
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  async me(): Promise<MeResponse> {
    // API returns envelope: { data: { user, workspace, availableWorkspaces }, meta: {...} }
    // Backwards compat: backend legado pode ainda retornar apenas o User.
    const { data } = await api.get<ApiResponse<MeResponse | User>>('/auth/me');
    const payload = data.data;
    if ('user' in payload) {
      return payload;
    }
    return {
      user: payload,
      workspace: null,
      availableWorkspaces: [],
    };
  },

  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/auth/logout', { refreshToken });
  },
};
