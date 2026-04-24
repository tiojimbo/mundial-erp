'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProcess } from '@/features/settings/hooks/use-processes';
import { useWorkflowStatuses } from '@/features/settings/hooks/use-workflow-statuses';
import { useInfiniteTasks } from '@/features/tasks/hooks/use-infinite-tasks';
import { TaskBoard } from '@/features/tasks/components/task-board';
import { deserializeTaskFilters } from '@/features/tasks/utils/task-filters-url';
import type { TaskStatus } from '@/features/tasks/types/task.types';

type PageProps = {
  params: { processId: string };
};

/**
 * `/processes/[processId]/board` — Kanban view do processo (TSK-703/704).
 * Filtros compartilhados Board/List via URL (deeplink, PLANO §12).
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function ProcessBoardPage({ params }: PageProps): JSX.Element {
  const { processId } = params;
  const searchParams = useSearchParams();

  const urlFilters = useMemo(
    () => deserializeTaskFilters(searchParams.toString()),
    [searchParams],
  );

  const process = useProcess(processId);
  const statusesQuery = useWorkflowStatuses(process.data?.departmentId ?? '');

  const tasksQuery = useInfiniteTasks({
    ...urlFilters,
    processIds: [processId],
    includeClosed: true,
  });

  const tasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [tasksQuery.data],
  );

  const statuses: TaskStatus[] = useMemo(() => {
    const list = statusesQuery.data ?? [];
    return list.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      color: s.color,
      icon: s.icon,
    }));
  }, [statusesQuery.data]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-title-h4 text-text-strong-950">
            {process.data?.name ?? 'Board'}
          </h1>
          <p className="text-paragraph-sm text-text-sub-600">
            Quadro Kanban do processo.
          </p>
        </div>
      </header>
      <TaskBoard
        tasks={tasks}
        statuses={statuses}
        isLoading={tasksQuery.isLoading || statusesQuery.isLoading}
      />
    </div>
  );
}
