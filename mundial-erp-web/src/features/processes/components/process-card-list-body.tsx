'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RiArrowDownSLine } from '@remixicon/react';
import {
  Calendar,
  Check,
  ChevronRight,
  GripVertical,
  MessageSquare,
  Pencil,
  Plus,
  Tag,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { StatusIcon } from './status-icon';
import { StatusIconPopover } from './status-icon-popover';
import { CustomFieldCell } from './custom-field-cell';
import { ColumnFieldsDrawer } from './column-fields-drawer';
import { formatShortDate } from '@/lib/formatters';
import { useTasksSelectionStore } from '@/stores/tasks-selection.store';
import { useProcessViews } from '@/features/process-views/hooks/use-process-views';
import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/use-custom-field-definitions';
import type { CustomFieldDefinition } from '@/features/custom-fields/types/custom-field.types';
import type {
  ProcessSummaryList,
  StatusGroupSummary,
  TaskItemSummary,
} from '@/features/navigation/types/process-summary.types';

const CF_COLUMN_WIDTH = 200;

const COLUMN_HEADERS = [
  { col: 'NAME', label: 'Nome', width: 400, resizable: true },
  { col: 'STATUS', label: 'Status', width: 160, resizable: true },
  { col: 'ASSIGNEE', label: 'Responsável', width: 200, resizable: true },
  { col: 'START_DATE', label: 'Início', width: 200, resizable: true },
  { col: 'DUE_DATE', label: 'Prazo', width: 200, resizable: true },
  { col: 'COMMENTS', label: 'Comentários', width: 150, resizable: false },
] as const;

type ProcessCardListBodyProps = {
  process: ProcessSummaryList;
};

export function ProcessCardListBody({ process }: ProcessCardListBodyProps) {
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false);
  const viewsQuery = useProcessViews(process.id);
  const definitionsQuery = useCustomFieldDefinitions({ listId: process.id });

  const customColumns = useMemo<CustomFieldDefinition[]>(() => {
    const listView = (viewsQuery.data ?? []).find((v) => v.viewType === 'LIST');
    const cfg = listView?.config as
      | { visibleCustomFields?: string[] }
      | undefined;
    const visibleIds = Array.isArray(cfg?.visibleCustomFields)
      ? cfg!.visibleCustomFields
      : [];
    if (visibleIds.length === 0) return [];
    const grouped = definitionsQuery.data;
    if (!grouped) return [];
    const all = [
      ...grouped.taskType,
      ...grouped.list,
      ...grouped.folder,
      ...grouped.space,
      ...(grouped.workspace ?? []),
    ] as CustomFieldDefinition[];
    const byId = new Map(all.map((d) => [d.id, d]));
    return visibleIds
      .map((id) => byId.get(id))
      .filter((d): d is CustomFieldDefinition => Boolean(d));
  }, [viewsQuery.data, definitionsQuery.data]);

  const hiddenStandardColumns = useMemo<Set<string>>(() => {
    const listView = (viewsQuery.data ?? []).find((v) => v.viewType === 'LIST');
    const cfg = listView?.config as
      | { hiddenStandardColumns?: string[] }
      | undefined;
    return new Set(
      Array.isArray(cfg?.hiddenStandardColumns)
        ? cfg!.hiddenStandardColumns
        : [],
    );
  }, [viewsQuery.data]);

  if (process.groups.length === 0) {
    return (
      <div className='px-5 pb-4'>
        <p className='text-[13px] text-muted-foreground'>
          Nenhum item neste processo.
        </p>
      </div>
    );
  }

  const totalTasks = process.groups.reduce((sum, g) => sum + g.count, 0);
  const visibleGroups =
    totalTasks === 0
      ? process.groups.slice(0, 1)
      : process.groups.filter((g) => g.count > 0);

  return (
    <div className='flex flex-col gap-4 pb-3 pt-2'>
      {visibleGroups.map((group) => (
        <StatusGroupSection
          key={group.statusId}
          group={group}
          listId={process.id}
          customColumns={customColumns}
          hiddenStandardColumns={hiddenStandardColumns}
          onAddColumn={() => setColumnsDrawerOpen(true)}
        />
      ))}
      <ColumnFieldsDrawer
        open={columnsDrawerOpen}
        onClose={() => setColumnsDrawerOpen(false)}
        listId={process.id}
      />
    </div>
  );
}

function StatusGroupSection({
  group,
  listId,
  customColumns,
  hiddenStandardColumns,
  onAddColumn,
}: {
  group: StatusGroupSummary;
  listId: string;
  customColumns: CustomFieldDefinition[];
  hiddenStandardColumns: Set<string>;
  onAddColumn: () => void;
}) {
  const visibleHeaders = COLUMN_HEADERS.filter(
    (c) => !hiddenStandardColumns.has(c.col),
  );
  const [expanded, setExpanded] = useState(true);

  return (
    <div className='relative'>
      {/* Status badge header — sticky */}
      <div className='sticky top-0 z-[25] flex min-h-10 items-center bg-background pl-6'>
        <div className='flex w-fit items-center gap-2'>
          <button
            type='button'
            onClick={() => setExpanded(!expanded)}
            className='flex cursor-pointer items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground'
          >
            <RiArrowDownSLine
              className={cn(
                'size-4 transition-transform duration-150',
                !expanded && '-rotate-90',
              )}
            />
          </button>

          {/* Status badge with dynamic color */}
          <div
            className='flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold uppercase leading-none tracking-wide transition-colors duration-150'
            style={{
              backgroundColor: hexToRgba(group.statusColor, 0.125),
              color: group.statusColor,
            }}
          >
            <StatusIcon
              type={group.statusType}
              color={group.statusColor}
              size={14}
            />
            <span>{group.statusName}</span>
          </div>

          <span className='ml-1 text-[12px] font-medium tabular-nums text-muted-foreground'>
            {group.count}
          </span>
        </div>
      </div>

      {/* Rows */}
      {expanded && (
        <div className='relative min-w-max'>
          {/* Column headers — sticky below status badge */}
          <div
            role='row'
            className='group relative sticky top-10 z-20 flex items-center bg-background pl-[44px] text-[0.8rem] text-muted-foreground'
          >
            {/* Select-all */}
            <div className='absolute bottom-0 left-0 top-0 flex w-[44px] items-center justify-end pr-1'>
              <button
                type='button'
                role='checkbox'
                aria-checked={false}
                data-state='unchecked'
                data-slot='checkbox'
                aria-label='Selecionar todas as tarefas'
                className='shadow-xs data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:ring-ring/50 peer flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input opacity-0 outline-none transition-opacity focus-visible:border-ring focus-visible:ring-[3px] group-hover:opacity-100 data-[state=checked]:opacity-100 data-[state=indeterminate]:opacity-100'
              />
            </div>

            {/* Inner row with columns — borda inferior alinhada com row-main-container das tasks */}
            <div className='ml-6 flex border-b border-border'>
              {visibleHeaders.map((c, idx) => (
                <div
                  key={c.col}
                  role='button'
                  tabIndex={0}
                  aria-disabled={idx === 0 ? 'true' : 'false'}
                  aria-roledescription='sortable'
                >
                  <div
                    data-col={c.col}
                    className='shrink-0'
                    style={{ width: c.width }}
                  >
                    <div>
                      <div data-state='closed' data-slot='context-menu-trigger'>
                        <div
                          role='columnheader'
                          aria-colindex={idx + 1}
                          aria-sort='none'
                          data-col={c.col}
                          className='relative flex items-center'
                          style={{ width: c.width }}
                        >
                          <div className='mt-2 w-full px-4 py-2 transition-all duration-200 hover:bg-gradient-to-r hover:from-transparent hover:to-accent'>
                            <div className='flex min-w-0 items-center gap-1.5'>
                              <span className='min-w-0 truncate text-ellipsis whitespace-nowrap font-medium'>
                                {c.label}
                              </span>
                            </div>
                          </div>
                          {c.resizable && (
                            <div
                              data-resize-handle='true'
                              className='absolute bottom-0 right-0 top-0 w-1 cursor-col-resize rounded-full hover:bg-[#5c52ed]'
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {customColumns.map((def, idx) => (
                <div
                  key={def.id}
                  role='columnheader'
                  aria-colindex={visibleHeaders.length + idx + 1}
                  data-col={`CF_${def.id}`}
                  className='relative flex shrink-0 items-center'
                  style={{ width: CF_COLUMN_WIDTH }}
                >
                  <div className='mt-2 w-full px-4 py-2'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='min-w-0 truncate whitespace-nowrap font-medium'>
                        {def.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add column */}
            <div
              role='columnheader'
              className='flex min-w-[40px] items-center justify-center'
            >
              <button
                type='button'
                data-slot='button'
                aria-label='Adicionar coluna'
                onClick={onAddColumn}
                className='text-sm focus-visible:ring-ring/50 inline-flex size-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px]'
              >
                <Plus className='size-4' aria-hidden />
              </button>
            </div>
          </div>

          {/* Task rows */}
          {group.items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              group={group}
              listId={listId}
              customColumns={customColumns}
              hiddenStandardColumns={hiddenStandardColumns}
            />
          ))}

          {/* Nova tarefa */}
          <button
            type='button'
            className='mt-2 block w-[400px] rounded-md px-4 py-2 pl-[44px] text-[12.8px] font-medium text-muted-foreground transition-all duration-200 hover:bg-gradient-to-r hover:from-transparent hover:to-accent'
          >
            Nova tarefa
          </button>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  item,
  group,
  listId,
  customColumns,
  hiddenStandardColumns,
}: {
  item: TaskItemSummary;
  group: StatusGroupSummary;
  listId: string;
  customColumns: CustomFieldDefinition[];
  hiddenStandardColumns: Set<string>;
}) {
  const router = useRouter();
  const isSelected = useTasksSelectionStore((s) =>
    s.selectedIds.includes(item.id),
  );
  const toggleSelection = useTasksSelectionStore((s) => s.toggle);
  const isOverdue =
    item.dueDate &&
    group.statusType !== 'DONE' &&
    group.statusType !== 'CLOSED' &&
    new Date(item.dueDate) < new Date();

  const openTask = () => router.push(`/tasks/${item.id}`);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      role='row-container'
      data-id={item.id}
      data-state='closed'
      data-slot='context-menu-trigger'
      data-selected={isSelected || undefined}
      onClick={openTask}
      className='group relative -mt-px flex cursor-pointer select-none border-b border-t border-b-transparent border-t-transparent pl-[44px] pr-10 text-[14px] leading-[21px] hover:z-[1] hover:border-b-border hover:border-t-border hover:bg-accent data-[selected]:bg-accent'
    >
      {/* Drag handle + checkbox */}
      <div
        className={cn(
          'absolute bottom-0 left-0 top-0 z-10 flex w-[44px] shrink-0 items-center justify-end gap-0.5 px-1 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={stop}
      >
        <div className='flex h-5 w-5 cursor-grab items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background active:cursor-grabbing'>
          <GripVertical className='h-3.5 w-3.5' strokeWidth={2} aria-hidden />
        </div>
        <button
          type='button'
          role='checkbox'
          aria-checked={isSelected}
          aria-label={
            isSelected ? `Desmarcar ${item.title}` : `Marcar ${item.title}`
          }
          data-state={isSelected ? 'checked' : 'unchecked'}
          data-slot='checkbox'
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(item.id);
          }}
          className={cn(
            'shadow-xs peer flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input outline-none transition-shadow',
            'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
            'focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]',
          )}
        >
          {isSelected && (
            <Check className='size-3' strokeWidth={3} aria-hidden />
          )}
        </button>
      </div>

      {/* Row main container — borda inferior única; some no hover externo. Evita
          aparência de borda dupla quando há múltiplas linhas adjacentes. */}
      <div
        role='row-main-container'
        className='relative ml-6 flex shrink-0 grow items-center border-b border-b-border group-hover:border-b-transparent'
      >
        {/* NAME col */}
        <div
          data-col='NAME'
          className='flex shrink-0 flex-col overflow-hidden'
          style={{ width: 400 }}
        >
          <div className='flex h-full w-full min-w-0 items-center overflow-hidden'>
            <div className='mr-3 flex w-full flex-row items-center gap-1.5'>
              <button
                type='button'
                onClick={stop}
                aria-label='Expandir subtarefas'
                className='flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-transparent text-muted-foreground opacity-0 transition-colors hover:border-border hover:bg-accent hover:text-foreground group-hover:opacity-100'
              >
                <ChevronRight
                  className='h-3.5 w-3.5 transition-transform duration-150'
                  aria-hidden
                />
              </button>

              <StatusIconPopover
                taskId={item.id}
                listId={listId}
                currentStatusId={item.statusId}
                currentType={group.statusType}
                currentColor={group.statusColor}
                size={14}
                typeIcon={item.typeIcon}
                typeName={item.typeName}
              />

              <span className='flex min-w-0 shrink flex-col gap-0.5 font-medium'>
                <Link
                  href={`/tasks/${item.id}`}
                  onClick={stop}
                  title={item.title}
                  className='block truncate'
                >
                  {item.title}
                </Link>
              </span>

              {/* Quick actions */}
              <div
                className='ml-auto flex flex-row items-center gap-1 leading-[1px] text-muted-foreground opacity-0 group-hover:opacity-100'
                onClick={stop}
              >
                <button
                  type='button'
                  aria-label='Criar subtask'
                  className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                >
                  <Plus className='h-3.5 w-3.5' aria-hidden />
                </button>
                <button
                  type='button'
                  aria-haspopup='dialog'
                  data-state='closed'
                  data-slot='popover-trigger'
                  aria-label='Tags'
                  className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                >
                  <Tag className='h-3.5 w-3.5' aria-hidden />
                </button>
                <button
                  type='button'
                  aria-label='Editar tarefa'
                  className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                >
                  <Pencil className='h-3.5 w-3.5' aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STATUS col */}
        {!hiddenStandardColumns.has('STATUS') && (
          <div
            data-col='STATUS'
            className='flex shrink-0 flex-col overflow-hidden'
            style={{ width: 160 }}
          >
            <div className='flex h-full w-fit items-center overflow-hidden rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border'>
              <div
                role='cell'
                data-col='STATUS'
                className='flex h-full w-full items-center overflow-hidden text-[0.8rem]'
              >
                <div
                  className='flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide'
                  style={{
                    backgroundColor: hexToRgba(group.statusColor, 0.125),
                    color: group.statusColor,
                  }}
                >
                  <StatusIcon
                    type={group.statusType}
                    color={group.statusColor}
                    size={12}
                  />
                  <span className='truncate'>{group.statusName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNEE col */}
        {!hiddenStandardColumns.has('ASSIGNEE') && (
        <div
          data-col='ASSIGNEE'
          className='flex shrink-0 flex-col overflow-visible'
          style={{ width: 200 }}
        >
          <div className='flex h-full w-full min-w-0 items-center overflow-visible rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border'>
            <div
              role='cell'
              data-col='ASSIGNEE'
              className='flex h-full w-full items-center overflow-visible text-[0.8rem]'
            >
              <button
                type='button'
                onClick={stop}
                aria-haspopup='dialog'
                data-state='closed'
                data-slot='popover-trigger'
                aria-label={item.assigneeName ?? 'Atribuir responsável'}
                className='flex w-full cursor-pointer items-center gap-2'
              >
                {item.assigneeId && item.assigneeName ? (
                  <span
                    data-slot='avatar'
                    title={item.assigneeName}
                    className='relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border transition-colors'
                    style={{
                      backgroundColor: avatarColorFromId(item.assigneeId),
                      color: '#fff',
                    }}
                  >
                    <span className='flex size-full items-center justify-center rounded-full text-[10px] font-semibold'>
                      {initialsFromName(item.assigneeName)}
                    </span>
                  </span>
                ) : (
                  <span className='ring-border/60 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-inset'>
                    <UserPlus className='h-3.5 w-3.5' aria-hidden />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* START_DATE col */}
        {!hiddenStandardColumns.has('START_DATE') && (
        <div
          data-col='START_DATE'
          className='flex shrink-0 flex-col overflow-hidden'
          style={{ width: 200 }}
        >
          <div className='flex h-full w-fit items-center overflow-hidden rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border'>
            <div
              role='cell'
              data-col='START_DATE'
              className='flex h-full w-full items-center overflow-hidden text-[0.8rem]'
            >
              <button
                type='button'
                onClick={stop}
                aria-haspopup='dialog'
                data-state='closed'
                data-slot='popover-trigger'
                aria-label={
                  item.startDate
                    ? 'Alterar data de início'
                    : 'Definir data de início'
                }
                className='flex w-full cursor-pointer items-center gap-2'
              >
                <span className='ring-border/60 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-inset transition-colors hover:bg-accent hover:text-foreground'>
                  <Calendar className='h-3.5 w-3.5' aria-hidden />
                </span>
                {item.startDate && (
                  <span className='text-muted-foreground'>
                    {formatShortDate(item.startDate)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* DUE_DATE col */}
        {!hiddenStandardColumns.has('DUE_DATE') && (
        <div
          data-col='DUE_DATE'
          className='flex shrink-0 flex-col overflow-hidden'
          style={{ width: 200 }}
        >
          <div className='flex h-full w-fit items-center overflow-hidden rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border'>
            <div
              role='cell'
              data-col='DUE_DATE'
              className='flex h-full w-full items-center overflow-hidden text-[0.8rem]'
            >
              <button
                type='button'
                onClick={stop}
                aria-haspopup='dialog'
                data-state='closed'
                data-slot='popover-trigger'
                aria-label={item.dueDate ? 'Alterar prazo' : 'Definir prazo'}
                className='flex w-full cursor-pointer items-center gap-2'
              >
                <span className='ring-border/60 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-inset transition-colors hover:bg-accent hover:text-foreground'>
                  <Calendar className='h-3.5 w-3.5' aria-hidden />
                </span>
                {item.dueDate && (
                  <span
                    className={cn(
                      isOverdue
                        ? 'font-medium text-destructive'
                        : 'text-muted-foreground',
                    )}
                  >
                    {formatShortDate(item.dueDate)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* COMMENTS col */}
        {!hiddenStandardColumns.has('COMMENTS') && (
        <div
          data-col='COMMENTS'
          className='flex shrink-0 flex-col overflow-hidden'
          style={{ width: 150 }}
        >
          <div className='flex h-full w-fit items-center overflow-hidden rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border'>
            {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
            <div
              role='cell'
              data-col='COMMENTS'
              aria-haspopup='dialog'
              data-state='closed'
              data-slot='popover-trigger'
              onClick={stop}
              className='hover:text-primary flex h-full w-full cursor-pointer items-center gap-1.5 overflow-hidden px-2 text-[0.8rem] transition-colors'
            >
              <MessageSquare
                className='h-3.5 w-3.5 shrink-0 text-muted-foreground'
                aria-hidden
              />
              <span>0</span>
            </div>
          </div>
        </div>
        )}

        {/* Colunas de custom fields */}
        {customColumns.map((def) => (
          <CustomFieldCell
            key={def.id}
            taskId={item.id}
            definition={def}
            width={200}
          />
        ))}
      </div>
    </div>
  );
}

function avatarColorFromId(id: string): string {
  const palette = [
    'rgb(225, 29, 72)',
    'rgb(234, 88, 12)',
    'rgb(202, 138, 4)',
    'rgb(22, 163, 74)',
    'rgb(13, 148, 136)',
    'rgb(37, 99, 235)',
    'rgb(124, 58, 237)',
    'rgb(192, 38, 211)',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] as string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
