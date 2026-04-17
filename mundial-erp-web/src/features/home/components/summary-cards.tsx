'use client';

import {
  RiAlertLine,
  RiCalendarCheckLine,
  RiCalendarLine,
  RiIndeterminateCircleLine,
  RiCheckboxCircleLine,
} from '@remixicon/react';
import type { MyTasksSummary } from '../types/my-tasks.types';

type CardDef = {
  label: string;
  key: keyof MyTasksSummary;
  icon: React.ElementType;
  sectionId: string;
};

const cards: CardDef[] = [
  { label: 'ATRASADAS', key: 'overdueCount', icon: RiAlertLine, sectionId: 'overdue' },
  { label: 'PARA HOJE', key: 'dueTodayCount', icon: RiCalendarCheckLine, sectionId: 'dueToday' },
  { label: 'PRÓXIMOS DIAS', key: 'dueNextDaysCount', icon: RiCalendarLine, sectionId: 'dueByDay' },
  { label: 'SEM DATA', key: 'noDueDateCount', icon: RiIndeterminateCircleLine, sectionId: 'noDueDate' },
  { label: 'CONCLUÍDAS (7D)', key: 'completedCount', icon: RiCheckboxCircleLine, sectionId: 'recentlyCompleted' },
];

type SummaryCardsProps = {
  summary: MyTasksSummary | undefined;
  isLoading: boolean;
  onScrollTo: (sectionId: string) => void;
};

export function SummaryCards({ summary, isLoading, onScrollTo }: SummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className='flex min-h-[94px] min-w-[179px] animate-pulse flex-col rounded-xl border bg-card p-4'
          >
            <div className='mb-3 h-3 w-16 rounded bg-muted' />
            <div className='h-7 w-10 rounded bg-muted' />
          </div>
        ))}
      </div>
    );
  }

  const totalActive = summary.totalActive || 1;

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
      {cards.map((card) => {
        const count = summary[card.key];
        const Icon = card.icon;

        return (
          <button
            key={card.key}
            className='group relative flex min-h-[94px] min-w-[179px] cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md'
            aria-label={`${card.label}: ${count} tarefas. Clique para navegar.`}
            onClick={() => onScrollTo(card.sectionId)}
          >
            <span className='flex items-center justify-between'>
              <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                {card.label}
              </span>
              <Icon className='size-4 text-muted-foreground' />
            </span>

            <span className='flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold text-foreground'>
                {count}
              </span>
              {card.key === 'noDueDateCount' && count !== totalActive && (
                <span className='text-[10px] text-muted-foreground/60'>
                  / {totalActive}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
