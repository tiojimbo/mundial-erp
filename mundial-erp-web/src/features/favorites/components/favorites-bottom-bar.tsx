'use client';

import { FavoriteChip } from './favorite-chip';
import { useFavorites } from '../hooks/use-favorites';

export function FavoritesBottomBar() {
  const { data } = useFavorites();
  const items = data?.BOTTOM ?? [];
  if (items.length === 0) return null;

  return (
    <div
      role='region'
      aria-label='Favoritos fixos no rodape'
      className='favorites-bar-scroll border-border/40 bg-background/95 w-full min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain border-t px-3 py-2 backdrop-blur'
    >
      <div className='flex w-max min-w-full flex-nowrap items-center gap-2'>
        {items.map((fav) => (
          <FavoriteChip key={fav.id} favorite={fav} />
        ))}
      </div>
    </div>
  );
}
