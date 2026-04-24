'use client';

import type { ReactNode } from 'react';

/**
 * Sprint 5 (TSK-150) — Linha de propriedade na grade.
 * tasks.md §4.3 — h-8, icon w-4 h-4 muted, label min-w-[130px] text-sm.
 */

export type PropertyRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

export function PropertyRow({ icon, label, children }: PropertyRowProps) {
  return (
    <div className="flex h-8 items-center gap-2">
      <div className="flex min-w-[130px] items-center gap-2 text-[12px] text-muted-foreground">
        <span className="flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
