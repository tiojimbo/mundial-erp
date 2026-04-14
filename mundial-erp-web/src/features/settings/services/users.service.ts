import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserFilters,
} from '../types/settings.types';

export const usersService = {
  async getAll(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const { data } = await api.get<PaginatedResponse<User>>('/users', {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const { data } = await api.post<User>('/users', payload);
    return data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
