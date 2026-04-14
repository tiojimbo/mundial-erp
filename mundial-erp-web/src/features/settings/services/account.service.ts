import { api } from '@/lib/api';
import type { User } from '@/types/auth.types';
import type { UpdateAccountPayload } from '../types/settings.types';

export const accountService = {
  async updateProfile(payload: UpdateAccountPayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me', payload);
    return data;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post<{ avatarUrl: string }>(
      '/users/me/avatar',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data;
  },
};
