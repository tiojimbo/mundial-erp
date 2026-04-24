'use client';

import Link from 'next/link';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RiCalendarLine } from '@remixicon/react';
import * as Checkbox from '@/components/ui/checkbox';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import { cn } from '@/lib/cn';

export type TaskTableRowData = {
  id: string;
  href: string;
  title: string;
  statusColor: string;
  startDate: string | null;
  dueDate: string | null;
  assignees: Array<{ id: string; name: string }>;
};

export type TaskTableGroup = {
  id: string;
  label: string;
  statusColor: string;
  count: number;
  tasks: TaskTableRowData[];
};

type TaskTableProps = {
  groups: TaskTableGroup[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, next: boolean) => void;
};

function formatDate(iso: string | null): {
  label: string;
  tone: 'overdue' | 'today' | 'future' | 'none';
} {
  if (!iso) return { label: '—', tone: 'none' };
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return { label: '—', tone: 'none' };
  if (isToday(date)) return { label: 'Hoje', tone: 'today' };
  const label = format(date, "dd 'de' MMM", { locale: ptBR });
  if (isPast(date)) return { label, tone: 'overdue' };
  return { label, tone: 'future' };
}

export function TaskTable({
  groups,
  selectedIds,
  onToggleSelect,
}: TaskTableProps): JSX.Element {
  return (
    <table className="w-full border-separate border-spacing-0 text-left text-paragraph-sm">
      <thead>
        <tr className="text-label-xs uppercase text-text-sub-600">
          <th className="w-10 bg-bg-weak-50 px-3 py-2 first:rounded-l-lg" />
          <th className="bg-bg-weak-50 px-3 py-2">Tarefa</th>
          <th className="bg-bg-weak-50 px-3 py-2">Inicio</th>
          <th className="bg-bg-weak-50 px-3 py-2">Prazo</th>
          <th className="bg-bg-weak-50 px-3 py-2 last:rounded-r-lg">
            Responsaveis
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <GroupBlock
            key={group.id}
            group={group}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </tbody>
    </table>
  );
}

function GroupBlock({
  group,
  selectedIds,
  onToggleSelect,
}: {
  group: TaskTableGroup;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, next: boolean) => void;
}): JSX.Element {
  return (
    <>
      <tr>
        <td colSpan={5} className="px-3 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: group.statusColor }}
            />
            <span className="text-label-sm text-text-strong-950">
              {group.label}
            </span>
            <span className="text-subheading-2xs text-text-sub-600">
              {group.count}
            </span>
          </div>
        </td>
      </tr>
      {group.tasks.map((task) => (
        <Row
          key={task.id}
          task={task}
          selected={selectedIds.has(task.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </>
  );
}

function Row({
  task,
  selected,
  onToggleSelect,
}: {
  task: TaskTableRowData;
  selected: boolean;
  onToggleSelect: (id: string, next: boolean) => void;
}): JSX.Element {
  const start = formatDate(task.startDate);
  const due = formatDate(task.dueDate);

  return (
    <tr className="group/row border-b border-stroke-soft-200 hover:bg-bg-weak-50">
      <td className="px-3 py-2">
        <Checkbox.Root
          checked={selected}
          onCheckedChange={(value) =>
            onToggleSelect(task.id, value === true)
          }
          aria-label={`Selecionar tarefa ${task.title}`}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: task.statusColor }}
          />
          <Link
            href={task.href}
            className="line-clamp-1 text-label-sm text-text-strong-950 hover:underline"
          >
            {task.title}
          </Link>
        </div>
      </td>
      <td className="px-3 py-2 text-subheading-2xs text-text-sub-600">
        <span className="inline-flex items-center gap-1">
          <RiCalendarLine className="size-3" aria-hidden />
          {start.label}
        </span>
      </td>
      <td className="px-3 py-2 text-subheading-2xs">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5',
            due.tone === 'overdue' && 'bg-error-lighter text-error-base',
            due.tone === 'today' && 'bg-warning-lighter text-warning-base',
            due.tone === 'future' && 'bg-bg-weak-50 text-text-sub-600',
            due.tone === 'none' && 'text-faded-base',
          )}
        >
          <RiCalendarLine className="size-3" aria-hidden />
          {due.label}
        </span>
      </td>
      <td className="px-3 py-2">
        {task.assignees.length > 0 ? (
          <AvatarGroup.Root size="24">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar.Root key={assignee.id} size="24">
                <span aria-hidden>
                  {assignee.name?.slice(0, 1).toUpperCase() ?? '?'}
                </span>
              </Avatar.Root>
            ))}
            {task.assignees.length > 3 && (
              <AvatarGroup.Overflow>
                +{task.assignees.length - 3}
              </AvatarGroup.Overflow>
            )}
          </AvatarGroup.Root>
        ) : (
          <span className="text-subheading-2xs text-faded-base">—</span>
        )}
      </td>
    </tr>
  );
}
