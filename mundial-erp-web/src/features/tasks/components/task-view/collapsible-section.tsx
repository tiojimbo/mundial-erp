'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useTasksStore } from '../../stores/tasks.store';
import type { CollapsibleSectionKey } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — CollapsibleSection padrao.
 * tasks.md §4.6 — chevron rotate -90 quando fechada (150ms), icon muted,
 * titulo font-semibold text-[13], counter, actions slot.
 * Estado persistido em Zustand (`collapsedSections[key]`).
 */

export type CollapsibleSectionProps = {
  sectionKey: CollapsibleSectionKey;
  title: string;
  icon?: ReactNode;
  counter?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
};

export function CollapsibleSection({
  sectionKey,
  title,
  icon,
  counter,
  actions,
  children,
  defaultCollapsed = false,
}: CollapsibleSectionProps) {
  const collapsed = useTasksStore(
    (s) => s.collapsedSections[sectionKey] ?? defaultCollapsed,
  );
  const toggle = useTasksStore((s) => s.toggleSection);
  const contentId = useId();

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggle(sectionKey)}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className="flex items-center gap-2 text-[13px] font-semibold text-foreground"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
              collapsed && '-rotate-90',
            )}
          />
          {icon && (
            <span className="h-4 w-4 text-muted-foreground" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{title}</span>
          {counter != null && (
            <span className="font-normal text-muted-foreground">{counter}</span>
          )}
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      {!collapsed && (
        <div id={contentId} className="flex flex-col gap-2">
          {children}
        </div>
      )}
    </section>
  );
}
