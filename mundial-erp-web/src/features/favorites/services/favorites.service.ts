import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  CreateFavoritePayload,
  Favorite,
  FavoriteCheckResponse,
  FavoriteEntityType,
  FavoritesGrouped,
} from '../types/favorite.types';

export const favoritesService = {
  async list(): Promise<FavoritesGrouped> {
    const { data } = await api.get<ApiResponse<FavoritesGrouped>>('/favorites');
    return data.data;
  },

  async check(
    entityType: FavoriteEntityType,
    entityId: string,
  ): Promise<FavoriteCheckResponse> {
    const { data } = await api.get<ApiResponse<FavoriteCheckResponse>>(
      `/favorites/check/${entityType}/${entityId}`,
    );
    return data.data;
  },

  async create(payload: CreateFavoritePayload): Promise<Favorite> {
    const { data } = await api.post<ApiResponse<Favorite>>(
      '/favorites',
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/favorites/${id}`);
  },
};
