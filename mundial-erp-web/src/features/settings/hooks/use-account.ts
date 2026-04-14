import { useMutation } from '@tanstack/react-query';
import { accountService } from '../services/account.service';
import type { UpdateAccountPayload } from '../types/settings.types';
import { useAuthStore } from '@/stores/auth.store';

export const ACCOUNT_QUERY_KEY = ['account'];

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: UpdateAccountPayload) =>
      accountService.updateProfile(payload),
    onSuccess: (data) => {
      useAuthStore.getState().setUser(data);
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => accountService.uploadAvatar(file),
    onSuccess: (data) => {
      const user = useAuthStore.getState().user;
      if (user) {
        useAuthStore.getState().setUser({ ...user, avatarUrl: data.avatarUrl });
      }
    },
  });
}
