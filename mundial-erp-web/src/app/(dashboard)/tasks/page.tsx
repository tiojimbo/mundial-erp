'use client';

import { MyTasksView } from '@/features/tasks/components/my-tasks-view';

/**
 * `/tasks` — minhas tarefas com novo visual (TSK-705).
 * Mantem contrato de `/my-tasks`: filtro `assigneeIds=[currentUserId]`.
 *
 * NOTE App Router: paginas exigem `export default` (excecao regra #13).
 */
export default function TasksPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">Minhas tarefas</h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Tarefas atribuidas a voce, organizadas por prazo.
        </p>
      </header>
      <MyTasksView />
    </div>
  );
}
