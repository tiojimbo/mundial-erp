'use client';

import { Link2, Plus } from 'lucide-react';

import type { TaskDetail } from '../../types/task.types';

import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';

/**
 * Sprint 5 (TSK-150) — Tarefas vinculadas.
 * tasks.md §4.8. Badge "Bloqueada por X" quando deps.waitingOn nao vazio.
 *
 * Integra com `task.links` e `task.dependencies` (TaskDetail).
 */

export type LinkedTasksSectionProps = {
  task: TaskDetail;
};

export function LinkedTasksSection({ task }: LinkedTasksSectionProps) {
  const links = task.links ?? [];
  const waiting = task.dependencies?.waitingOn ?? [];
  const counter = links.length + waiting.length;

  return (
    <CollapsibleSection
      sectionKey="linked-tasks"
      title="Tarefas vinculadas"
      icon={<Link2 className="h-4 w-4" />}
      counter={counter > 0 ? counter : undefined}
      actions={
        <button
          type="button"
          aria-label="Adicionar vinculo"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      }
    >
      {waiting.length > 0 && (
        <div
          role="note"
          className="rounded-md bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-700 dark:text-amber-400"
        >
          Bloqueada por {waiting.length} tarefa(s).
        </div>
      )}
      {links.length === 0 && waiting.length === 0 ? (
        <EmptyCardCta label="Vincular tarefa" />
      ) : (
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-[13px] hover:bg-muted/40"
            >
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                href={`/tasks/${link.toTaskId}`}
                className="flex-1 truncate hover:underline"
              >
                {link.toTaskId}
              </a>
              <span className="text-[11px] text-muted-foreground">
                relacionada
              </span>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  );
}
