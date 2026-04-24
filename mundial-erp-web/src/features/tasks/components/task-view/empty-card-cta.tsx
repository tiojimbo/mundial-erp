'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

/**
 * Sprint 5 (TSK-150) — CTA vazio em card pontilhado.
 * tasks.md §4.6 — border-dashed border-border/60 + Plus + label,
 * w-full rounded-lg px-4 py-3.
 */

export type EmptyCardCtaProps = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export function EmptyCardCta({ label, icon, onClick }: EmptyCardCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-3 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground"
    >
      {icon ?? <Plus className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}
