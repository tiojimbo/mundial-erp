'use client';

import { ListChecks } from 'lucide-react';

import type { TaskDetail } from '../../types/task.types';

import { ChecklistPanel } from './checklist-panel';
import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';

/**
 * Sprint 5 (TSK-150) — Secao de checklists.
 * tasks.md §4.11.
 */

export type ChecklistsSectionProps = {
  task: TaskDetail;
};

export function ChecklistsSection({ task }: ChecklistsSectionProps) {
  const checklists = task.checklists ?? [];

  return (
    <CollapsibleSection
      sectionKey="checklists"
      title="Checklists"
      icon={<ListChecks className="h-4 w-4" />}
      counter={checklists.length > 0 ? checklists.length : undefined}
    >
      {checklists.length === 0 ? (
        <EmptyCardCta label="Criar checklist" />
      ) : (
        <div className="flex flex-col gap-2">
          {checklists.map((cl) => (
            <ChecklistPanel key={cl.id} checklist={cl} />
          ))}
          <EmptyCardCta label="Criar checklist" />
        </div>
      )}
    </CollapsibleSection>
  );
}
