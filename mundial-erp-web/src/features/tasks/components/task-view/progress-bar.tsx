'use client';

/**
 * Sprint 5 (TSK-150) — Progress bar para subtasks/checklists.
 * tasks.md §4.10 — h-1 bg-muted fill bg-primary.
 * A11y: role="progressbar" + aria-valuenow/max.
 */

export type ProgressBarProps = {
  value: number;
  max: number;
  label?: string;
};

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-label={label ?? `${value} de ${safeMax} concluidos`}
      className="h-1 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-200"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
