'use client';

import { Play, Timer } from 'lucide-react';

import type { TaskDetail } from '../../types/task.types';

import { CollapsibleSection } from './collapsible-section';

/**
 * Sprint 5 (TSK-150) — Tempo rastreado (STUB).
 * tasks.md §4.9.
 *
 * Time tracking esta fora do escopo do PLANO-TASKS.md §1.4.
 * UI renderiza o shell, acao "Iniciar" e no-op.
 */

export type TimeTrackingSectionProps = {
  task: Pick<TaskDetail, 'trackedMinutes' | 'timeSpentSeconds'>;
};

function formatSeconds(seconds: number): string {
  if (seconds <= 0) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function TimeTrackingSection({ task }: TimeTrackingSectionProps) {
  return (
    <CollapsibleSection
      sectionKey="time-tracking"
      title="Tempo rastreado"
      icon={<Timer className="h-4 w-4" />}
      counter={task.timeSpentSeconds > 0 ? formatSeconds(task.timeSpentSeconds) : undefined}
      actions={
        <button
          type="button"
          aria-label="Iniciar rastreamento de tempo"
          disabled
          title="Disponivel em sprint futura"
          className="inline-flex h-6 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <Play className="h-3 w-3" />
          Iniciar
        </button>
      }
    >
      <p className="text-[12px] text-muted-foreground">
        Nenhuma entrada de tempo. (Modulo disponivel em sprint futura.)
      </p>
    </CollapsibleSection>
  );
}
