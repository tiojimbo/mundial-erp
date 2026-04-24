'use client';

import { Settings2 } from 'lucide-react';

import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';

/**
 * Sprint 5 (TSK-150) — Campos personalizados.
 * tasks.md §4.7 — CollapsibleSection + list + CTA "Criar campo personalizado".
 *
 * TODO: list real quando backend de CustomFields for implementado.
 */

export type CustomFieldsSectionProps = {
  taskId: string;
};

export function CustomFieldsSection({ taskId: _taskId }: CustomFieldsSectionProps) {
  return (
    <CollapsibleSection
      sectionKey="custom-fields"
      title="Campos personalizados"
      actions={
        <button
          type="button"
          aria-label="Gerenciar campos personalizados desta lista"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      }
    >
      <EmptyCardCta label="Criar campo personalizado" />
    </CollapsibleSection>
  );
}
