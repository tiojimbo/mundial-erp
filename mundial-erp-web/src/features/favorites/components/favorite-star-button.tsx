'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api';
import {
  useCreateFavorite,
  useDeleteFavorite,
  useFavoriteCheck,
} from '../hooks/use-favorites';
import type {
  FavoriteEntityType,
  FavoritePosition,
} from '../types/favorite.types';

type FavoriteStarButtonProps = {
  entityType: FavoriteEntityType;
  entityId: string;
};

const POSITION_OPTIONS: Array<{
  position: FavoritePosition;
  label: string;
  hint: string;
}> = [
  { position: 'TOP', label: 'Topo', hint: 'Fixar no topo do sidebar' },
  {
    position: 'SIDEBAR',
    label: 'Sidebar',
    hint: 'Aparece na lista do sidebar',
  },
  { position: 'BOTTOM', label: 'Rodape', hint: 'Fixar no rodape do sidebar' },
];

export function FavoriteStarButton({
  entityType,
  entityId,
}: FavoriteStarButtonProps) {
  const [open, setOpen] = useState(false);
  const { data } = useFavoriteCheck(entityType, entityId);
  const createFavorite = useCreateFavorite();
  const deleteFavorite = useDeleteFavorite();

  const favorited = !!data?.favorited;

  const handleClick = () => {
    if (favorited && data?.favorite) {
      deleteFavorite.mutate(data.favorite.id, {
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
      return;
    }
    setOpen(true);
  };

  const handleChoose = (position: FavoritePosition) => {
    createFavorite.mutate(
      { entityType, entityId, position },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <button
              type='button'
              onClick={handleClick}
              aria-haspopup={favorited ? undefined : 'dialog'}
              aria-pressed={favorited}
              aria-label={
                favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
              }
              disabled={createFavorite.isPending || deleteFavorite.isPending}
              className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
            >
              <Star
                className='size-3.5'
                strokeWidth={2}
                fill={favorited ? 'currentColor' : 'none'}
                aria-hidden
              />
            </button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content side='bottom'>
          {favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        </Tooltip.Content>
      </Tooltip.Root>
      <Popover.Content
        align='end'
        sideOffset={8}
        className='w-56 p-1'
        showArrow={false}
      >
        <div className='px-2 py-1.5 text-[12px] font-semibold text-muted-foreground'>
          Onde fixar?
        </div>
        {POSITION_OPTIONS.map(({ position, label, hint }) => (
          <button
            key={position}
            type='button'
            onClick={() => handleChoose(position)}
            disabled={createFavorite.isPending}
            className='flex w-full flex-col items-start gap-0 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50'
          >
            <span className='font-medium text-foreground'>{label}</span>
            <span className='text-[11px] text-muted-foreground'>{hint}</span>
          </button>
        ))}
      </Popover.Content>
    </Popover.Root>
  );
}
