'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteTasks } from '@/features/tasks/hooks/use-infinite-tasks';
import { TaskCalendar } from '@/features/tasks/components/task-calendar';
import { deserializeTaskFilters } from '@/features/tasks/utils/task-filters-url';

type PageProps = {
  params: { processId: string };
};

/**
 * `/processes/[processId]/calendar` — view calendario (TSK-801).
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function ProcessCalendarPage({ params }: PageProps): JSX.Element {
  const { processId } = params;
  const searchParams = useSearchParams();

  const urlFilters = useMemo(
    () => deserializeTaskFilters(searchParams.toString()),
    [searchParams],
  );

  const tasksQuery = useInfiniteTasks({
    ...urlFilters,
    processIds: [processId],
  });

  const tasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [tasksQuery.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">Calendario</h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Arraste para reagendar — uma confirmacao sera solicitada antes de persistir.
        </p>
      </header>
      <TaskCalendar tasks={tasks} isLoading={tasksQuery.isLoading} />
    </div>
  );
}
