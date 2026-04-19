'use client';

import { useState } from 'react';
import {
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiCheckLine,
} from '@remixicon/react';
import { InboxFilterPopover } from './inbox-filter-popover';
import { ConfirmDialog } from './confirm-dialog';
import type { InboxView, NotificationFilters } from '../types/notification.types';

type InboxToolbarProps = {
  view: InboxView;
  filters: NotificationFilters;
  onFiltersChange: (filters: NotificationFilters) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDeleteAll: () => void;
  isEmpty?: boolean;
};

export function InboxToolbar({
  view,
  filters,
  onFiltersChange,
  onMarkAllRead,
  onClearAll,
  onDeleteAll,
  isEmpty,
}: InboxToolbarProps) {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Count active filters
  const activeFilterCount =
    (filters.types?.length ?? 0) +
    (filters.period ? 1 : 0) +
    (filters.unreadOnly ? 1 : 0);

  const isCleared = view === 'cleared';

  return (
    <div className='flex items-center justify-between border-b border-border px-4 py-2'>
      <div className='flex items-center gap-2'>
        <InboxFilterPopover
          filters={filters}
          onFiltersChange={onFiltersChange}
          activeFilterCount={activeFilterCount}
        />
      </div>

      <div className='flex items-center gap-1'>
        {!isCleared && (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:text-muted-foreground/40'
            onClick={onMarkAllRead}
            disabled={isEmpty}
          >
            <RiCheckDoubleLine className='h-4 w-4' />
            Marcar tudo como lido
          </button>
        )}

        {isCleared ? (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label-xs text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:text-muted-foreground/40'
            onClick={() => setShowDeleteDialog(true)}
            disabled={isEmpty}
          >
            <RiDeleteBinLine className='h-4 w-4' />
            Excluir tudo
          </button>
        ) : (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:text-muted-foreground/40'
            onClick={() => setShowClearDialog(true)}
            disabled={isEmpty}
          >
            <RiCheckLine className='h-4 w-4' />
            Limpar tudo
          </button>
        )}
      </div>

      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title='Limpar todas as notificações?'
        description='Todas as notificações desta visualização serão movidas para Limpas.'
        confirmLabel='Limpar'
        onConfirm={() => {
          onClearAll();
          setShowClearDialog(false);
        }}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title='Excluir todas as notificações limpas?'
        description='Esta ação não pode ser desfeita.'
        confirmLabel='Excluir'
        variant='destructive'
        onConfirm={() => {
          onDeleteAll();
          setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}
