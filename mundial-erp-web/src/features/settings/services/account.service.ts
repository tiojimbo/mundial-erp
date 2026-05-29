import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { User } from '@/types/auth.types';
import type { UpdateAccountPayload } from '../types/settings.types';

export const accountService = {
  async updateProfile(payload: UpdateAccountPayload): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>('/users/me', payload);
    return data.data;
  },

  async uploadAvatar(imageDataUrl: string): Promise<User> {
    const { data } = await api.post<ApiResponse<User>>('/users/me/avatar', {
      image: imageDataUrl,
    });
    return data.data;
  },

  async deleteAvatar(): Promise<User> {
    const { data } = await api.delete<ApiResponse<User>>('/users/me/avatar');
    return data.data;
  },
};
