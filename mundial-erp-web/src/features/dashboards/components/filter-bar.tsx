'use client';

import { RiFilterLine, RiCloseLine, RiRefreshLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import type { DashboardFilter } from '../types/dashboard.types';
import { FILTER_OPERATOR_LABELS } from '../types/dashboard.types';

type FilterBarProps = {
  filters: DashboardFilter[];
  autoRefreshSeconds: number | null;
  onRemoveFilter: (filterId: string) => void;
  onAddFilter: () => void;
};

export function FilterBar({
  filters,
  autoRefreshSeconds,
  onRemoveFilter,
  onAddFilter,
}: FilterBarProps) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button.Root
        variant='neutral'
        mode='stroke'
        size='xsmall'
        onClick={onAddFilter}
      >
        <Button.Icon as={RiFilterLine} />
        Filtro
      </Button.Root>

      {filters.map((filter) => (
        <Badge.Root key={filter.id} variant='lighter' color='blue' size='medium'>
          {filter.label}: {FILTER_OPERATOR_LABELS[filter.operator]}{' '}
          {String(filter.value)}
          <button
            type='button'
            onClick={() => onRemoveFilter(filter.id)}
            className='ml-1 rounded-full p-0.5 hover:bg-primary-alpha-10'
          >
            <RiCloseLine className='size-3' />
          </button>
        </Badge.Root>
      ))}

      {autoRefreshSeconds && (
        <div className='ml-auto flex items-center gap-1 text-paragraph-xs text-text-soft-400'>
          <RiRefreshLine className='size-3.5' />
          Auto-refresh {autoRefreshSeconds}s
        </div>
      )}
    </div>
  );
}
