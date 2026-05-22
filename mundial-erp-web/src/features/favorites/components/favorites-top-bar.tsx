'use client';

import { FavoriteChip } from './favorite-chip';
import { useFavorites } from '../hooks/use-favorites';

export function FavoritesTopBar() {
  const { data } = useFavorites();
  const items = data?.TOP ?? [];
  if (items.length === 0) return null;

  return (
    <div
      role='region'
      aria-label='Favoritos fixos no topo'
      className='relative w-full min-w-0'
    >
      <div className='favorites-bar-scroll w-full min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain pb-1.5 pt-0.5'>
        <div className='flex w-max min-w-full flex-nowrap items-center gap-1'>
          {items.map((fav) => (
            <FavoriteChip key={fav.id} favorite={fav} />
          ))}
        </div>
      </div>
    </div>
  );
}
