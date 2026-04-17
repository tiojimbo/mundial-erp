'use client';

import * as Popover from '@/components/ui/popover';
import * as Checkbox from '@/components/ui/checkbox';
import * as Radio from '@/components/ui/radio';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import { RiFilterLine } from '@remixicon/react';

import type {
  NotificationFilters,
  NotificationType,
} from '../types/notification.types';

type InboxFilterPopoverProps = {
  filters: NotificationFilters;
  onFiltersChange: (filters: NotificationFilters) => void;
  activeFilterCount: number;
};

const NOTIFICATION_TYPE_OPTIONS: Array<{
  value: NotificationType;
  label: string;
}> = [
  { value: 'task.overdue', label: 'Task overdue' },
  { value: 'task.due_soon', label: 'Task due soon' },
  { value: 'message', label: 'Message' },
  { value: 'mention', label: 'Mention' },
  { value: 'system', label: 'System' },
];

const PERIOD_OPTIONS: Array<{
  value: NonNullable<NotificationFilters['period']>;
  label: string;
}> = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
];

export function InboxFilterPopover({
  filters,
  onFiltersChange,
  activeFilterCount,
}: InboxFilterPopoverProps) {
  const handleTypeToggle = (type: NotificationType, checked: boolean) => {
    const currentTypes = filters.types ?? [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter((t) => t !== type);

    onFiltersChange({
      ...filters,
      types: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handlePeriodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      period: value as NotificationFilters['period'],
    });
  };

  const handleUnreadToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      unreadOnly: checked || undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-xs font-medium text-text-sub-600 shadow-regular-xs transition duration-200 ease-out hover:border-transparent hover:bg-bg-weak-50 hover:text-text-strong-950 hover:shadow-none'>
          <RiFilterLine className='size-4' />
          Filter
          {activeFilterCount > 0 && (
            <span className='flex size-5 items-center justify-center rounded-full bg-primary-base text-[10px] font-medium text-static-white'>
              {activeFilterCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content align='start' className='w-72'>
        <div className='space-y-4'>
          {/* Notification types */}
          <div className='space-y-2.5'>
            <p className='text-label-xs text-text-sub-600'>Type</p>
            <div className='space-y-2'>
              {NOTIFICATION_TYPE_OPTIONS.map((option) => {
                const isChecked =
                  filters.types?.includes(option.value) ?? false;
                return (
                  <label
                    key={option.value}
                    className='flex cursor-pointer items-center gap-2'
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleTypeToggle(option.value, checked === true)
                      }
                    />
                    <span className='text-paragraph-sm text-text-strong-950'>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Period */}
          <div className='space-y-2.5'>
            <p className='text-label-xs text-text-sub-600'>Period</p>
            <Radio.Group
              value={filters.period ?? ''}
              onValueChange={handlePeriodChange}
              className='space-y-2'
            >
              {PERIOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className='flex cursor-pointer items-center gap-2'
                >
                  <Radio.Item value={option.value} />
                  <span className='text-paragraph-sm text-text-strong-950'>
                    {option.label}
                  </span>
                </label>
              ))}
            </Radio.Group>
          </div>

          {/* Unread only */}
          <div className='flex items-center justify-between'>
            <Label.Root htmlFor='unread-only-switch'>
              Unread only
            </Label.Root>
            <Switch.Root
              id='unread-only-switch'
              checked={filters.unreadOnly ?? false}
              onCheckedChange={handleUnreadToggle}
            />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='w-full'
              onClick={handleClearFilters}
            >
              Clear filters
            </Button.Root>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
