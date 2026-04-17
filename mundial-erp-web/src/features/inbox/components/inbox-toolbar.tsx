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
            Mark all read
          </button>
        )}

        {isCleared ? (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-error-base transition duration-200 ease-out hover:bg-red-alpha-10 disabled:pointer-events-none disabled:text-text-disabled-300'
            onClick={() => setShowDeleteDialog(true)}
            disabled={isEmpty}
          >
            <RiDeleteBinLine className='size-4' />
            Delete all
          </button>
        ) : (
          <button
            className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-sub-600 transition duration-200 ease-out hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:pointer-events-none disabled:text-text-disabled-300'
            onClick={() => setShowClearDialog(true)}
            disabled={isEmpty}
          >
            <RiCheckLine className='size-4' />
            Clear all
          </button>
        )}
      </div>

      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title='Clear all notifications?'
        description='All notifications in this view will be moved to cleared.'
        confirmLabel='Clear'
        onConfirm={() => {
          onClearAll();
          setShowClearDialog(false);
        }}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title='Delete all cleared notifications?'
        description='This cannot be undone.'
        confirmLabel='Delete'
        variant='destructive'
        onConfirm={() => {
          onDeleteAll();
          setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}
