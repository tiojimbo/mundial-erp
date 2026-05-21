'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiListCheck2,
  RiLayoutColumnLine,
  RiChat1Line,
  RiCalendar2Line,
  RiBarChart2Line,
  type RemixiconComponentType,
} from '@remixicon/react';
import { Calendar, Folder, LayoutList, Plus, SquareKanban } from 'lucide-react';
import { BreadcrumbTrail } from '@/components/layout/breadcrumb-trail';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useAuth } from '@/providers/auth-provider';
import { useDeleteProcessView } from '@/features/process-views/hooks/use-delete-process-view';
import { useTasksGrouped } from '@/features/tasks/hooks/use-tasks-grouped';
import { ProcessCardListBody } from '@/features/processes/components/process-card-list-body';
import { ProcessToolbar } from '@/features/processes/components/process-toolbar';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { NewViewPopover } from '@/features/process-views/components/new-view-popover';
import {
  ViewContextMenu,
  type ViewContextMenuState,
} from '@/features/process-views/components/view-context-menu';
import { useProcessViews } from '@/features/process-views/hooks/use-process-views';
import { useProcess } from '@/features/settings/hooks/use-processes';
import type { ProcessViewType } from '@/features/process-views/types/process-view.types';
import { TaskBoard } from '@/features/tasks/components/task-board';
import type { Task, TaskStatus } from '@/features/tasks/types/task.types';
import type { TasksGroupedItem } from '@/features/tasks/services/tasks.service';
import type {
  SidebarDepartment,
  SidebarArea,
  SidebarProcess,
} from '@/features/navigation/types/navigation.types';
import type { ProcessSummaryList } from '@/features/navigation/types/process-summary.types';

const VIEW_TYPE_ICON: Record<ProcessViewType, RemixiconComponentType> = {
  LIST: RiListCheck2,
  BOARD: RiLayoutColumnLine,
  CALENDAR: RiCalendar2Line,
  GANTT: RiBarChart2Line,
};

const VIEW_TYPE_LABEL: Record<ProcessViewType, string> = {
  LIST: 'Lista',
  BOARD: 'Quadro',
  CALENDAR: 'Calendário',
  GANTT: 'Gantt',
};


/**
 * Find the matching department + area + process from the sidebar tree using URL slugs.
 */
function findProcess(
  tree: SidebarDepartment[] | undefined,
  deptSlug: string,
  processSlug: string,
): {
  dept: SidebarDepartment;
  area: SidebarArea | null;
  process: SidebarProcess;
} | null {
  if (!tree) return null;
  for (const dept of tree) {
    if (dept.slug !== deptSlug) continue;
    for (const area of dept.areas) {
      for (const process of area.processes) {
        if (process.slug === processSlug) {
          return { dept, area, process };
        }
      }
    }
    // Also check directProcesses (no area)
    for (const process of dept.directProcesses) {
      if (process.slug === processSlug) {
        return { dept, area: null, process };
      }
    }
  }
  return null;
}

export default function GenericProcessPage() {
  const params = useParams<{ deptSlug: string; processSlug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: sidebarTree, isLoading: isTreeLoading } = useSidebarTree();

  const [activeViewId, setActiveViewId] = useState<string>('list');
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ViewContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    viewId: null,
  });

  function handleViewContextMenu(e: React.MouseEvent, viewId: string) {
    e.preventDefault();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, viewId });
  }

  function handleDeleteView() {
    const id = contextMenu.viewId;
    if (!id || id === 'list' || !isAdmin) return;
    const view = customViews?.find((v) => v.id === id);
    const confirmed = window.confirm(
      `Excluir permanentemente a view "${view?.name ?? id}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    deleteView.mutate(id, {
      onSuccess: () => {
        if (activeViewId === id) setActiveViewId('list');
      },
    });
  }

  const match = useMemo(
    () => findProcess(sidebarTree, params.deptSlug, params.processSlug),
    [sidebarTree, params.deptSlug, params.processSlug],
  );

  const { data: groupedData, isLoading: isDataLoading } = useTasksGrouped(
    match?.process.id ?? null,
  );

  const { data: customViews } = useProcessViews(match?.process.id);
  const deleteView = useDeleteProcessView(match?.process.id);
  const { data: processConfig } = useProcess(match?.process.id ?? '');
  const defaultTaskType = processConfig?.defaultTaskType ?? null;

  const activeCustomView = useMemo(() => {
    if (activeViewId === 'list') return null;
    return customViews?.find((v) => v.id === activeViewId) ?? null;
  }, [activeViewId, customViews]);

  const isBoardActive = activeViewId === 'board' || activeCustomView?.viewType === 'BOARD';
  const isCalendarActive = activeViewId === 'calendar' || activeCustomView?.viewType === 'CALENDAR';

  const boardTasks: Task[] = useMemo(() => {
    if (!groupedData) return [];
    const term = search.trim().toLowerCase();
    const all = groupedData.flatMap((entry: TasksGroupedItem) =>
      entry.tasks.map((task) => ({
        ...task,
        status: {
          id: entry.group.id,
          name: entry.group.name,
          type: entry.group.label,
          color: entry.group.color,
        },
      })),
    );
    return all.filter((task) => {
      if (!showClosed && task.status.type === 'CLOSED') return false;
      if (term && !task.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [groupedData, search, showClosed]);

  const boardStatuses: TaskStatus[] = useMemo(() => {
    if (!groupedData) return [];
    return groupedData.map((entry) => ({
      id: entry.group.id,
      name: entry.group.name,
      type: entry.group.label,
      color: entry.group.color,
    }));
  }, [groupedData]);

  // Build a ProcessSummaryList from the grouped data
  const processSummary: ProcessSummaryList | null = useMemo(() => {
    if (!match) return null;
    const { process, area } = match;
    return {
      id: process.id,
      name: process.name,
      slug: process.slug,
      processType: 'LIST' as const,
      featureRoute: process.featureRoute,
      description: process.description,
      isPrivate: process.isPrivate,
      areaId: area?.id ?? null,
      areaName: area?.name ?? null,
      totalItems:
        groupedData?.reduce((sum, e) => sum + e.tasks.length, 0) ?? 0,
      groups: (groupedData ?? []).map((entry) => ({
        statusId: entry.group.id,
        statusName: entry.group.name,
        statusColor: entry.group.color,
        statusType: entry.group.label,
        count: entry.tasks.length,
        items: entry.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          statusId: task.statusId,
          priority: task.priority,
          assigneeId: task.primaryAssigneeId,
          assigneeName: task.primaryAssigneeName,
          startDate: task.startDate,
          dueDate: task.dueDate,
          sortOrder: task.sortOrder,
          typeIcon: task.customType?.icon ?? null,
          typeName: task.customType?.value ?? null,
        })),
      })),
    };
  }, [match, groupedData]);

  const closedCount = useMemo(() => {
    if (!groupedData) return 0;
    return groupedData
      .filter((e) => e.group.label === 'DONE' || e.group.label === 'CLOSED')
      .reduce((acc, e) => acc + e.tasks.length, 0);
  }, [groupedData]);

  // Loading state (tree not yet loaded)
  if (isTreeLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-10 w-96 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-12 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-weak-50" />
      </div>
    );
  }

  // Not found state
  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
        <p className="text-paragraph-sm">Processo não encontrado.</p>
      </div>
    );
  }

  const { dept, area, process } = match;

  return (
    <div className="relative -m-4 flex min-h-0 flex-1 flex-col overflow-hidden lg:-m-6">
      {/* Page Header — FIXO (não rola) */}
      <div className="shrink-0 border-b-[0.8px] border-stroke-soft-200">
        <BreadcrumbTrail
          items={[
            { label: dept.name, href: `/d/${dept.slug}` },
            ...(area
              ? [
                  { label: area.name, icon: Folder, href: `/d/${dept.slug}/a/${area.slug}` },
                  { label: process.name, icon: LayoutList },
                ]
              : [{ label: process.name, icon: Folder }]),
          ]}
          favoriteTarget={{ entityType: 'LIST', entityId: process.id }}
        />

        {/* Tabs */}
        <nav className="flex items-center overflow-x-auto border-b border-border px-10">
          <button
            type="button"
            onClick={() => setActiveViewId('list')}
            onContextMenu={(e) => handleViewContextMenu(e, 'list')}
            className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
              activeViewId === 'list'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="size-3.5 shrink-0" aria-hidden />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setActiveViewId('board')}
            className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
              activeViewId === 'board'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SquareKanban className="size-3.5 shrink-0" aria-hidden />
            Quadro
          </button>
          <button
            type="button"
            onClick={() => setActiveViewId('calendar')}
            className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
              activeViewId === 'calendar'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            Calendário
          </button>
          {customViews?.map((view) => {
            const Icon = VIEW_TYPE_ICON[view.viewType];
            const isActive = activeViewId === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveViewId(view.id)}
                onContextMenu={(e) => handleViewContextMenu(e, view.id)}
                className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
                  isActive
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                {view.name}
              </button>
            );
          })}
          <NewViewPopover
            processId={process.id}
            trigger={
              <button
                type="button"
                className="flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3.5 shrink-0" aria-hidden />
                Nova Visualização
              </button>
            }
            onCreated={(viewId) => setActiveViewId(viewId)}
          />

        </nav>
      </div>

      {/* Toolbar — compartilhada entre List, Board e demais views */}
      <ProcessToolbar
        search={search}
        onSearchChange={setSearch}
        showClosed={showClosed}
        onShowClosedChange={setShowClosed}
        closedCount={closedCount}
        onCreateTask={() => setIsCreateOpen(true)}
        defaultTaskType={defaultTaskType}
        customFieldsScope={
          process?.id ? { kind: 'list', listId: process.id } : undefined
        }
      />

      {/* Tab Content */}
      {(activeViewId === 'list' || activeCustomView?.viewType === 'LIST') && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Content: Single ProcessCard — ÚNICO elemento com scroll */}
          <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-auto pb-24">
            {isDataLoading ? (
              <div className="space-y-4 px-10">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-bg-weak-50"
                  />
                ))}
              </div>
            ) : processSummary ? (
              <div className="py-2">
                <ProcessCardListBody process={processSummary} />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isBoardActive && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-10 py-4">
          <TaskBoard
            tasks={boardTasks}
            statuses={boardStatuses}
            isLoading={isDataLoading}
            defaultTaskType={defaultTaskType}
          />
        </div>
      )}

      {isCalendarActive && (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <Calendar className="size-8" aria-hidden />
          <p className="text-[13px]">Visualização Calendário em breve.</p>
        </div>
      )}

      {activeCustomView &&
        activeCustomView.viewType !== 'LIST' &&
        activeCustomView.viewType !== 'BOARD' &&
        activeCustomView.viewType !== 'CALENDAR' && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            {(() => {
              const Icon = VIEW_TYPE_ICON[activeCustomView.viewType];
              return <Icon className="size-8" />;
            })()}
            <p className="text-[13px]">
              Visualização {VIEW_TYPE_LABEL[activeCustomView.viewType]} em
              breve.
            </p>
          </div>
        )}

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        lockedProcessId={process.id}
        lockedProcessName={process.name}
        onCreated={(taskId) => router.push(`/tasks/${taskId}`)}
      />

      <ViewContextMenu
        state={contextMenu}
        onOpenChange={(open) =>
          setContextMenu((s) => ({ ...s, open }))
        }
        canDelete={isAdmin && contextMenu.viewId !== 'list'}
        onDelete={handleDeleteView}
      />
    </div>
  );
}
