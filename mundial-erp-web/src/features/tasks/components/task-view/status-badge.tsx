'use client';

import * as React from 'react';
import { Check, Search } from 'lucide-react';
import { Command } from 'cmdk';

import { cn } from '@/lib/cn';
import * as Popover from '@/components/ui/popover';
import type { TaskStatus } from '../../types/task.types';

type StatusCategory = TaskStatus['category'];

const CATEGORY_ORDER: StatusCategory[] = [
  'NOT_STARTED',
  'ACTIVE',
  'DONE',
  'CLOSED',
];

const CATEGORY_LABEL: Record<StatusCategory, string> = {
  NOT_STARTED: 'Não iniciado',
  ACTIVE: 'Ativo',
  DONE: 'Feito',
  CLOSED: 'Fechado',
};

function StatusIndicator({ status }: { status: TaskStatus }) {
  const color = status.color || 'oklch(55% 0.01 60)';

  if (status.category === 'NOT_STARTED') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2 shrink-0">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke={color}
          strokeWidth="1.8"
          strokeDasharray="3.5 3"
          fill="none"
        />
      </svg>
    );
  }

  if (status.category === 'ACTIVE') {
    const progress = 0.33;
    const angle = progress * 2 * Math.PI;
    const x = 12 + 8.5 * Math.sin(angle);
    const y = 12 - 8.5 * Math.cos(angle);
    const largeArc = progress > 0.5 ? 1 : 0;
    const clipId = `clip-${status.id}`;
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2 shrink-0">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="7.6" />
        </clipPath>
        <path
          d={`M 12,12 L 12,3.5 A 8.5,8.5 0 ${largeArc} 1 ${x},${y} Z`}
          fill={color}
          clipPath={`url(#${clipId})`}
        />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2 shrink-0">
      <circle cx="12" cy="12" r="8.5" fill={color} />
      <path
        d="M8.5 12.5L11 15L15.5 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type StatusBadgeProps = {
  status: TaskStatus;
  taskId: string;
  availableStatuses?: TaskStatus[];
  onStatusChange?: (status: TaskStatus) => void;
  onToggleComplete?: () => void;
};

export function StatusBadge({
  status,
  availableStatuses = [],
  onStatusChange,
  onToggleComplete,
}: StatusBadgeProps) {
  const [open, setOpen] = React.useState(false);
  const color = status.color || 'oklch(55% 0.01 60)';

  const grouped = React.useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: availableStatuses.filter((s) => s.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [availableStatuses]);

  return (
    <div className="-mx-1.5 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-1.5">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`Alterar status: ${status.name}`}
              className="group/split inline-flex h-[22px] cursor-pointer items-center rounded-[4px] hover:opacity-80"
              style={{ backgroundColor: color }}
            >
              <span className="flex h-full items-center whitespace-nowrap rounded-l-[4px] px-2.5 text-[11px] font-medium uppercase tracking-wide text-white">
                {status.name}
              </span>
              <span className="flex h-full w-6 items-center justify-center rounded-r-[4px] border-l border-white/20">
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  fill="white"
                  aria-hidden="true"
                >
                  <path d="M3 2 L8 5 L3 8 Z" />
                </svg>
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Content
            align="start"
            sideOffset={4}
            showArrow={false}
            unstyled
            style={{ width: 220, height: 309.6 }}
            className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
          >
            <Command className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Command.Input
                  placeholder="Buscar status..."
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="min-h-0 flex-1 overflow-y-auto p-1">
                <Command.Empty className="py-6 text-center text-[12px] text-muted-foreground">
                  Nenhum status encontrado.
                </Command.Empty>
                {grouped.map(({ category, items }) => (
                  <Command.Group
                    key={category}
                    heading={CATEGORY_LABEL[category]}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((s) => {
                      const selected = s.id === status.id;
                      return (
                        <Command.Item
                          key={s.id}
                          value={`${s.category}-${s.name}`}
                          onSelect={() => {
                            onStatusChange?.(s);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex cursor-pointer items-center rounded-[6px] px-2 py-1.5 text-[12px]',
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                          )}
                        >
                          <StatusIndicator status={s} />
                          <span className="truncate text-[11px] uppercase tracking-wide">
                            {s.name}
                          </span>
                          {selected && (
                            <Check className="ml-auto h-3.5 w-3.5 flex-shrink-0" />
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Root>

        <button
          type="button"
          onClick={onToggleComplete}
          aria-label="Concluir tarefa"
          className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[4px] border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Check className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
