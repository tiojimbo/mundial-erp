import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { favoritesService } from '../services/favorites.service';
import type {
  CreateFavoritePayload,
  FavoriteEntityType,
} from '../types/favorite.types';

export const FAVORITES_KEY = ['favorites'] as const;
export const favoriteCheckKey = (
  entityType: FavoriteEntityType,
  entityId: string,
) => ['favorites', 'check', entityType, entityId] as const;

export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: () => favoritesService.list(),
    staleTime: 60_000,
  });
}

export function useFavoriteCheck(
  entityType: FavoriteEntityType | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: entityType && entityId ? favoriteCheckKey(entityType, entityId) : ['favorites', 'check', 'noop'],
    queryFn: () => favoritesService.check(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });
}

export function useCreateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFavoritePayload) =>
      favoritesService.create(payload),
    onSuccess: (favorite) => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
      qc.invalidateQueries({
        queryKey: favoriteCheckKey(favorite.entityType, favorite.entityId),
      });
    },
  });
}

export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => favoritesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
      qc.invalidateQueries({ queryKey: ['favorites', 'check'] });
    },
  });
}

export const useUnfavorite = useDeleteFavorite;
