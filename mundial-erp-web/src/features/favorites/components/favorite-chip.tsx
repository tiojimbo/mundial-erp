'use client';

import Link from 'next/link';
import { PinOff } from 'lucide-react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useUnfavorite } from '../hooks/use-favorites';
import {
  favoriteHref,
  favoriteIcon,
  favoriteLabel,
} from '../lib/favorite-utils';
import type { Favorite } from '../types/favorite.types';

type FavoriteChipProps = {
  favorite: Favorite;
};

export function FavoriteChip({ favorite }: FavoriteChipProps) {
  const { data: tree } = useSidebarTree();
  const unfavorite = useUnfavorite();
  const Icon = favoriteIcon(favorite.entityType);
  const href = favoriteHref(favorite, tree);
  const label = favoriteLabel(favorite, tree);

  const content = (
    <>
      <Icon
        className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/fav:text-primary"
        aria-hidden
      />
      <span className="max-w-40 truncate font-medium tracking-tight">
        {label}
      </span>
    </>
  );

  return (
    <div className="group/fav relative flex h-6 shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 transition-all duration-150 hover:border-border hover:bg-muted hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97] active:cursor-grabbing">
      {href ? (
        <Link
          href={href}
          title={label}
          className="flex h-full items-center gap-1.5 px-2 text-[11px] text-foreground/70 transition-colors group-hover/fav:text-foreground"
        >
          {content}
        </Link>
      ) : (
        <span
          title={label}
          className="flex h-full items-center gap-1.5 px-2 text-[11px] text-foreground/70"
        >
          {content}
        </span>
      )}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-lg bg-muted pl-3 pr-1 opacity-0 transition-opacity group-hover/fav:pointer-events-auto group-hover/fav:opacity-100">
        <button
          type="button"
          onClick={() => unfavorite.mutate(favorite.id)}
          disabled={unfavorite.isPending}
          aria-label="Desfavoritar"
          className="flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background/60 hover:text-destructive disabled:opacity-50"
        >
          <PinOff className="size-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}
