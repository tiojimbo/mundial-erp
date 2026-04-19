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
  { value: 'task.overdue', label: 'Tarefa atrasada' },
  { value: 'task.due_soon', label: 'Tarefa vencendo' },
  { value: 'message', label: 'Mensagem' },
  { value: 'mention', label: 'Menção' },
  { value: 'system', label: 'Sistema' },
];

const PERIOD_OPTIONS: Array<{
  value: NonNullable<NotificationFilters['period']>;
  label: string;
}> = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
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
        <button className='inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-label-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground'>
          <RiFilterLine className='h-4 w-4' />
          Filtrar
          {activeFilterCount > 0 && (
            <span className='flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background'>
              {activeFilterCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content align='start' className='w-72'>
        <div className='space-y-4'>
          {/* Notification types */}
          <div className='space-y-2.5'>
            <p className='text-label-xs text-muted-foreground'>Tipo</p>
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
                    <span className='text-paragraph-sm text-foreground'>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Period */}
          <div className='space-y-2.5'>
            <p className='text-label-xs text-muted-foreground'>Período</p>
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
                  <span className='text-paragraph-sm text-foreground'>
                    {option.label}
                  </span>
                </label>
              ))}
            </Radio.Group>
          </div>

          {/* Unread only */}
          <div className='flex items-center justify-between'>
            <Label.Root htmlFor='unread-only-switch'>
              Apenas não lidas
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
              Limpar filtros
            </Button.Root>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
