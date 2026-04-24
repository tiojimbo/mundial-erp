'use client';

import { Suspense } from 'react';
import { TaskListView } from '@/features/tasks/components/task-list-view';

/**
 * `/tasks/all` — listagem workspace-wide com data-table, filtros e bulk actions.
 * Stories: TSK-701 / TSK-702 / TSK-707 (PLANO-TASKS.md §12).
 *
 * NOTE App Router: paginas exigem `export default` (excecao documentada em
 * `09-git-workflow.md` regra #13).
 */
export default function TasksAllPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">Todas as tarefas</h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Listagem completa com filtros avancados e acoes em lote.
        </p>
      </header>
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="h-96 animate-pulse rounded-lg bg-bg-weak-50"
          />
        }
      >
        <TaskListView />
      </Suspense>
    </div>
  );
}
