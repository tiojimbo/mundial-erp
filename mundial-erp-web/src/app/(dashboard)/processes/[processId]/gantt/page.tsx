'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteTasks } from '@/features/tasks/hooks/use-infinite-tasks';
import { TaskGantt } from '@/features/tasks/components/task-gantt';
import { deserializeTaskFilters } from '@/features/tasks/utils/task-filters-url';

type PageProps = {
  params: { processId: string };
};

/**
 * `/processes/[processId]/gantt` — Gantt read-only com dependencies (TSK-802).
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function ProcessGanttPage({ params }: PageProps): JSX.Element {
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
        <h1 className="text-title-h4 text-text-strong-950">Gantt</h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Linha do tempo das tarefas do processo. Dependencias mostradas em leitura.
        </p>
      </header>
      <TaskGantt tasks={tasks} isLoading={tasksQuery.isLoading} />
    </div>
  );
}
