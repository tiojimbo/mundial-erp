'use client';

import * as React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import * as Popover from '@/components/ui/popover';
import { useWorkflowStatuses } from '@/features/settings/hooks/use-workflow-statuses';
import { useUpdateTaskStatus } from '@/features/tasks/hooks/use-update-task-status';
import type { TaskStatus } from '@/features/tasks/types/task.types';

import { StatusIcon } from './status-icon';

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

export type StatusIconPopoverProps = {
  taskId: string;
  departmentId: string;
  areaId?: string | null;
  currentStatusId: string;
  currentCategory: StatusCategory;
  currentColor: string;
  size?: number;
};

export function StatusIconPopover({
  taskId,
  departmentId,
  areaId,
  currentStatusId,
  currentCategory,
  currentColor,
  size = 14,
}: StatusIconPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const { data: workflowStatuses, isLoading } = useWorkflowStatuses(
    departmentId,
    areaId ?? undefined,
  );
  const updateStatus = useUpdateTaskStatus(taskId);

  const grouped = React.useMemo(() => {
    const list = workflowStatuses ?? [];
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: list.filter((s) => s.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [workflowStatuses]);

  const handleSelect = (s: TaskStatus) => {
    setOpen(false);
    if (s.id === currentStatusId) return;
    updateStatus.mutate({ statusId: s.id, status: s });
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Alterar status"
          className="inline-flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors hover:bg-bg-weak-50"
        >
          <StatusIcon
            category={currentCategory}
            color={currentColor}
            size={size}
          />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        sideOffset={4}
        showArrow={false}
        unstyled
        onClick={(e) => e.stopPropagation()}
        style={{ width: 240 }}
        className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
      >
        <Tabs.Root defaultValue="status">
          <Tabs.List className="inline-flex w-full items-center justify-start border-b border-border bg-transparent p-0">
            <Tabs.Trigger
              value="status"
              className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[12px] font-medium text-muted-foreground transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
            >
              Status
            </Tabs.Trigger>
            <Tabs.Trigger
              value="type"
              className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[12px] font-medium text-muted-foreground transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
            >
              Type
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="status" className="m-0 max-h-64 overflow-auto p-1">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                Carregando status...
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                Nenhum status disponível.
              </div>
            ) : (
              grouped.map(({ category, items }) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                    {CATEGORY_LABEL[category]}
                  </div>
                  {items.map((s) => {
                    const selected = s.id === currentStatusId;
                    const statusForMutation: TaskStatus = {
                      id: s.id,
                      name: s.name,
                      category: s.category,
                      color: s.color,
                      icon: s.icon ?? null,
                    };
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect(statusForMutation)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors hover:bg-accent',
                          selected && 'bg-accent',
                        )}
                      >
                        <StatusIcon
                          category={s.category}
                          color={s.color}
                          size={14}
                        />
                        <span className="flex-1 truncate text-[11px] uppercase tracking-wide">
                          {s.name}
                        </span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </Tabs.Content>
          <Tabs.Content value="type" className="m-0 max-h-64 overflow-auto p-1">
            <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
              Sem types cadastrados.
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </Popover.Content>
    </Popover.Root>
  );
}
