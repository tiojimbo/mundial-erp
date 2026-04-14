import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import type {
  UserFilters,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types/settings.types';

export const USERS_KEY = ['users'];

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: [...USERS_KEY, filters],
    queryFn: () => usersService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
