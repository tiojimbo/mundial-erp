'use client';

import { useState } from 'react';
import {
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiCheckLine,
} from '@remixicon/react';
import * as CompactButton from '@/components/ui/compact-button';

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
    <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-2'>
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
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-sub-600 transition duration-200 ease-out hover:bg-bg-weak-50 hover:text-text-strong-950'
            onClick={onMarkAllRead}
            disabled={isEmpty}
          >
            <RiCheckDoubleLine className='size-4' />
            Marcar tudo como lido
          </button>
        )}

        {isCleared ? (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-error-base transition duration-200 ease-out hover:bg-red-alpha-10 disabled:pointer-events-none disabled:text-text-disabled-300'
            onClick={() => setShowDeleteDialog(true)}
            disabled={isEmpty}
          >
            <RiDeleteBinLine className='size-4' />
            Excluir tudo
          </button>
        ) : (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-sub-600 transition duration-200 ease-out hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:pointer-events-none disabled:text-text-disabled-300'
            onClick={() => setShowClearDialog(true)}
            disabled={isEmpty}
          >
            <RiCheckLine className='size-4' />
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
