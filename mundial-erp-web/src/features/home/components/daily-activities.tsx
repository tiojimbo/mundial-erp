'use client';

import { RiCalendarTodoLine } from '@remixicon/react';
import { useDailyActivities } from '../hooks/use-daily-activities';
import { ActivityCard } from './activity-card';

export function DailyActivities() {
  const { data, isLoading } = useDailyActivities();
  const activities = data?.activities ?? [];

  if (isLoading) {
    return (
      <section>
        <h2 className='text-label-md text-text-strong-950'>
          Atividades do dia
        </h2>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='h-36 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50'
            />
          ))}
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <section>
        <h2 className='text-label-md text-text-strong-950'>
          Atividades do dia
        </h2>
        <div className='mt-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-8 text-center shadow-regular-xs'>
          <RiCalendarTodoLine className='mx-auto size-8 text-text-soft-400' />
          <p className='mt-2 text-paragraph-sm text-text-soft-400'>
            Nenhuma atividade atribuída a você hoje.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className='text-label-md text-text-strong-950'>
        Atividades do dia
        <span className='ml-2 text-paragraph-sm text-text-sub-600'>
          ({activities.length})
        </span>
      </h2>
      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </section>
  );
}
