'use client';

import type { TaskDetail } from '../../types/task.types';

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
  const done = subtasks.filter((s) => s.status.category === 'DONE').length;
  const total = subtasks.length;

  return (
    <CollapsibleSection
      sectionKey="subtasks"
      title="Subtarefas"
      counter={total > 0 ? `${done}/${total}` : undefined}
    >
      {total > 0 && <ProgressBar value={done} max={total} />}
      {total === 0 ? (
        <EmptyCardCta label="Adicionar subtarefa" />
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
