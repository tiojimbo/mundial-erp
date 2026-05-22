'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, PinOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useFavorites, useUnfavorite } from '../hooks/use-favorites';
import {
  favoriteHref,
  favoriteIcon,
  favoriteLabel,
} from '../lib/favorite-utils';
import type { Favorite } from '../types/favorite.types';

type FavoritesSectionProps = {
  isExpanded: boolean;
};

export function FavoritesSection({ isExpanded }: FavoritesSectionProps) {
  const { data } = useFavorites();
  const [open, setOpen] = useState(true);
  const items = data?.SIDEBAR ?? [];
  if (items.length === 0) return null;

  if (!isExpanded) {
    return (
      <ul className='space-y-px px-2'>
        {items.map((fav) => (
          <FavoriteSidebarItem key={fav.id} favorite={fav} compact />
        ))}
      </ul>
    );
  }

  return (
    <div className='relative flex w-full min-w-0 flex-col'>
      <div className='flex items-center justify-between px-4 pb-1 pt-4'>
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          className='group/header flex flex-1 items-center gap-1 rounded-md py-0.5 transition-colors hover:bg-sidebar-accent'
        >
          <span className='text-sidebar-foreground/70 flex h-4 flex-1 truncate text-[12px] font-medium tracking-[-0.132px]'>
            Favoritos
          </span>
          <ChevronRight
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground opacity-0 transition-transform group-hover/header:opacity-100',
              open && 'rotate-90',
            )}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <ul className='flex w-full min-w-0 flex-col gap-0.5 px-2'>
          {items.map((fav) => (
            <FavoriteSidebarItem key={fav.id} favorite={fav} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FavoriteSidebarItem({
  favorite,
  compact = false,
}: {
  favorite: Favorite;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { data: tree } = useSidebarTree();
  const unfavorite = useUnfavorite();
  const Icon = favoriteIcon(favorite.entityType);
  const href = favoriteHref(favorite, tree);
  const label = favoriteLabel(favorite, tree);
  const isActive = href ? pathname === href : false;

  if (compact) {
    return (
      <li>
        {href ? (
          <Link
            href={href}
            title={label}
            className={cn(
              'flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
              isActive && 'bg-sidebar-accent text-foreground',
            )}
          >
            <Icon className='size-3.5' strokeWidth={1.75} aria-hidden />
          </Link>
        ) : (
          <span
            title={label}
            className='flex items-center justify-center rounded-md p-1.5 text-muted-foreground'
          >
            <Icon className='size-3.5' strokeWidth={1.75} aria-hidden />
          </span>
        )}
      </li>
    );
  }

  return (
    <li className='group/menu-item relative'>
      {href ? (
        <Link
          href={href}
          title={label}
          className={cn(
            'group/fav outline-hidden flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-[13px] transition-colors',
            isActive
              ? 'bg-sidebar-accent font-medium text-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
          )}
        >
          <Icon
            className='group-hover/fav:text-primary size-3.5 shrink-0 text-muted-foreground transition-colors'
            strokeWidth={1.75}
            aria-hidden
          />
          <span className='truncate'>{label}</span>
          <button
            type='button'
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              unfavorite.mutate(favorite.id);
            }}
            disabled={unfavorite.isPending}
            aria-label='Desfavoritar'
            className='hover:bg-background/60 absolute right-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-all hover:text-destructive disabled:opacity-50 group-hover/menu-item:opacity-100'
          >
            <PinOff className='size-3' aria-hidden />
          </button>
        </Link>
      ) : (
        <span
          title={label}
          className='group/fav flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-[13px] text-muted-foreground'
        >
          <Icon className='size-3.5 shrink-0' strokeWidth={1.75} aria-hidden />
          <span className='truncate'>{label}</span>
        </span>
      )}
    </li>
  );
}
