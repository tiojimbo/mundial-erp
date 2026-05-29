import { useQuery } from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import type { UserFilters } from '../types/settings.types';

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
