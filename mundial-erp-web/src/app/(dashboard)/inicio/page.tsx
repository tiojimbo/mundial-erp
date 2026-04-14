'use client';

import { Greeting } from '@/features/home/components/greeting';
import { StatsCards } from '@/features/home/components/stats-cards';
import { DailyActivities } from '@/features/home/components/daily-activities';
import { PendingHandoffs } from '@/features/home/components/pending-handoffs';
import { useDailyActivities } from '@/features/home/hooks/use-daily-activities';
import { usePendingHandoffs } from '@/features/home/hooks/use-pending-handoffs';
import type { HomeStats } from '@/features/home/types/home.types';

export default function InicioPage() {
  const { data: activitiesData, isLoading: isLoadingActivities } =
    useDailyActivities();
  const { data: handoffsData, isLoading: isLoadingHandoffs } =
    usePendingHandoffs();

  const stats: HomeStats | undefined =
    activitiesData && handoffsData
      ? {
          pendingActivities: activitiesData.total,
          inProgressOrders: activitiesData.activities.filter(
            (a) => a.status === 'IN_PROGRESS',
          ).length,
          pendingHandoffs: handoffsData.total,
        }
      : undefined;

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <Greeting />
      <StatsCards
        stats={stats}
        isLoading={isLoadingActivities || isLoadingHandoffs}
      />
      <DailyActivities />
      <PendingHandoffs />
    </div>
  );
}
