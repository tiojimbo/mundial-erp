'use client';

import { useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { RiCalendarLine, RiSearchLine } from '@remixicon/react';
import type { ReportFilters } from '../types/report.types';

type PeriodSelectorProps = {
  onApply: (filters: ReportFilters) => void;
  isLoading?: boolean;
};

function getDefaultPeriod() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
  };
}

export function PeriodSelector({ onApply, isLoading }: PeriodSelectorProps) {
  const defaults = getDefaultPeriod();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  return (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='space-y-1.5'>
        <label className='text-label-xs text-text-sub-600'>Data Início</label>
        <Input.Root>
          <Input.Wrapper>
            <Input.Icon as={RiCalendarLine} />
            <Input.Input
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <div className='space-y-1.5'>
        <label className='text-label-xs text-text-sub-600'>Data Fim</label>
        <Input.Root>
          <Input.Wrapper>
            <Input.Icon as={RiCalendarLine} />
            <Input.Input
              type='date'
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <Button.Root
        variant='primary'
        mode='filled'
        size='small'
        onClick={() => onApply({ from, to })}
        disabled={isLoading}
      >
        <Button.Icon as={RiSearchLine} />
        {isLoading ? 'Carregando...' : 'Gerar'}
      </Button.Root>
    </div>
  );
}
