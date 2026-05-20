'use client';

import type { TaskDetail } from '../../types/task.types';
import { useCreateTask } from '../../hooks/use-create-task';

import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';
import { ProgressBar } from './progress-bar';
import { SubtaskRow } from './subtask-row';

/**
 * Sprint 5 (TSK-150) — Subtarefas.
 * tasks.md §4.10 — ProgressBar + list + EmptyCardCta.
 * dnd-kit via SubtaskRow (drag handle); SortableContext em sprint futura.
 */

export type SubtasksSectionProps = {
  task: TaskDetail;
};

export function SubtasksSection({ task }: SubtasksSectionProps) {
  const subtasks = task.subtasks ?? [];
  const done = subtasks.filter((s) => s.status.type === 'DONE').length;
  const total = subtasks.length;
  const createTask = useCreateTask();

  const handleAdd = () => {
    createTask.mutate({
      processId: task.processId,
      parentId: task.id,
      title: 'Nova subtarefa',
    });
  };

  return (
    <CollapsibleSection
      sectionKey="subtasks"
      title="Subtarefas"
      counter={total > 0 ? `${done}/${total}` : undefined}
    >
      {total > 0 && <ProgressBar value={done} max={total} />}
      {total === 0 ? (
        <EmptyCardCta label="Adicionar subtarefa" onClick={handleAdd} />
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {subtasks.map((st) => (
            <li key={st.id}>
              <SubtaskRow task={st} />
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  );
}
