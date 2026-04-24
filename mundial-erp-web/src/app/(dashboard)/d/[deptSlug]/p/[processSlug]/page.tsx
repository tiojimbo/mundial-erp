'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiAddLine,
  RiListCheck2,
  RiLayoutColumnLine,
  RiChat1Line,
  RiPushpinLine,
  RiFolderOpenLine,
  RiArrowDownSLine,
  RiStarLine,
  RiCalendar2Line,
  RiBarChart2Line,
  type RemixiconComponentType,
} from '@remixicon/react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useAuth } from '@/providers/auth-provider';
import { useDeleteProcessView } from '@/features/process-views/hooks/use-delete-process-view';
import { useWorkItemsGrouped } from '@/features/work-items/hooks/use-work-items';
import { ProcessCardListBody } from '@/features/work-items/components/process-card-list-body';
import { ProcessToolbar } from '@/features/work-items/components/process-toolbar';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { NewViewPopover } from '@/features/process-views/components/new-view-popover';
import {
  ViewContextMenu,
  type ViewContextMenuState,
} from '@/features/process-views/components/view-context-menu';
import { useProcessViews } from '@/features/process-views/hooks/use-process-views';
import type { ProcessViewType } from '@/features/process-views/types/process-view.types';
import { TaskBoard } from '@/features/tasks/components/task-board';
import { useWorkflowStatuses } from '@/features/settings/hooks/use-workflow-statuses';
import type { Task, TaskStatus } from '@/features/tasks/types/task.types';
import type { WorkItem, WorkItemGroup } from '@/features/work-items/types/work-item.types';
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
 * Adapta `WorkItem` (retorno de `/work-items/grouped`) para o shape `Task`
 * consumido pelo `TaskBoard`. Campos de ricos que nao vem no endpoint de
 * grouped (tags, watchers, points, etc) recebem defaults sensatos — o Board
 * so usa titulo, status, assignees primarios e datas para renderizar.
 */
function mapWorkItemToTask(
  item: WorkItem,
  group: WorkItemGroup,
  processId: string,
): Task {
  return {
    id: item.id,
    processId,
    title: item.title,
    description: item.description ?? null,
    markdownContent: null,
    status: {
      id: group.statusId,
      name: group.statusName,
      category: group.category,
      color: group.statusColor,
      icon: group.statusIcon,
    },
    statusId: item.statusId,
    itemType: item.itemType,
    priority: item.priority,
    customTypeId: null,
    customType: null,
    primaryAssigneeId: item.assigneeId,
    primaryAssigneeName: item.assigneeName,
    assignees: item.assigneeId
      ? [
          {
            userId: item.assigneeId,
            userName: item.assigneeName,
            isPrimary: true,
          },
        ]
      : [],
    tags: [],
    creatorId: item.creatorId,
    creatorName: item.creatorName,
    parentId: item.parentId,
    mergedIntoId: null,
    startDate: item.startDate,
    dueDate: item.dueDate,
    completedAt: item.completedAt,
    closedAt: item.closedAt,
    archived: false,
    estimatedMinutes: item.estimatedMinutes,
    trackedMinutes: item.trackedMinutes,
    timeSpentSeconds: 0,
    points: null,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  } as Task;
}

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

  const { data: groupedData, isLoading: isDataLoading } = useWorkItemsGrouped(
    match?.process.id ?? '',
    'status',
  );

  const { data: customViews } = useProcessViews(match?.process.id);
  const deleteView = useDeleteProcessView(match?.process.id);

  const activeCustomView = useMemo(() => {
    if (activeViewId === 'list') return null;
    return customViews?.find((v) => v.id === activeViewId) ?? null;
  }, [activeViewId, customViews]);

  const isBoardActive = activeCustomView?.viewType === 'BOARD';

  const boardStatusesQuery = useWorkflowStatuses(
    match?.dept.id ?? '',
    match?.area?.id ?? undefined,
  );

  // Usa a mesma fonte da List view (`useWorkItemsGrouped`) — endpoint
  // `/work-items/grouped` comprovadamente retorna as tasks do processo.
  // O `/tasks` workspace-wide estava retornando vazio neste contexto.
  // Cada task carrega seu status completo, entao derivamos `boardStatuses`
  // com merge entre workflow-statuses (ordem + colunas vazias) e statuses
  // embutidos (defensivo).
  const boardTasks: Task[] = useMemo(() => {
    if (!groupedData?.groups) return [];
    const processId = match?.process.id ?? '';
    const term = search.trim().toLowerCase();
    const all = groupedData.groups.flatMap((group: WorkItemGroup) =>
      group.items.map((item: WorkItem) =>
        mapWorkItemToTask(item, group, processId),
      ),
    );
    return all.filter((task) => {
      if (!showClosed && task.status.category === 'CLOSED') return false;
      if (term && !task.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [groupedData, match?.process.id, search, showClosed]);

  const boardStatuses: TaskStatus[] = useMemo(() => {
    const fromWorkflow = (boardStatusesQuery.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      color: s.color,
      icon: s.icon,
    }));
    const byId = new Map<string, TaskStatus>(
      fromWorkflow.map((s) => [s.id, s]),
    );
    if (groupedData?.groups) {
      for (const g of groupedData.groups) {
        if (!byId.has(g.statusId)) {
          byId.set(g.statusId, {
            id: g.statusId,
            name: g.statusName,
            category: g.category,
            color: g.statusColor,
            icon: g.statusIcon,
          });
        }
      }
    }
    return Array.from(byId.values());
  }, [boardStatusesQuery.data, groupedData]);

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
      totalItems: groupedData?.total ?? 0,
      groups: (groupedData?.groups ?? []).map((g) => ({
        statusId: g.statusId,
        statusName: g.statusName,
        statusColor: g.statusColor,
        statusCategory: g.category,
        count: g.count,
        items: g.items.map((item) => ({
          id: item.id,
          title: item.title,
          statusId: item.statusId,
          priority: item.priority,
          assigneeId: item.assigneeId,
          assigneeName: item.assigneeName,
          startDate: item.startDate,
          dueDate: item.dueDate,
          sortOrder: item.sortOrder,
        })),
      })),
    };
  }, [match, groupedData]);

  const closedCount = useMemo(() => {
    if (!groupedData?.groups) return 0;
    return groupedData.groups
      .filter((g) => g.category === 'DONE' || g.category === 'CLOSED')
      .reduce((acc, g) => acc + g.count, 0);
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
        {/* Breadcrumb */}
        <header className="flex items-center gap-[6px] px-10 py-4">
          <Link
            href={`/d/${dept.slug}`}
            className="max-w-[200px] truncate text-[13px] font-normal tracking-[-0.143px] text-text-sub-600 transition-colors hover:text-text-strong-950"
          >
            {dept.name}
          </Link>
          <span className="text-[12px] tracking-[-0.143px] text-text-sub-600/40">
            /
          </span>
          <RiFolderOpenLine className="size-4 text-text-sub-600" />
          <span className="max-w-[200px] truncate text-[13px] font-semibold tracking-[-0.143px] text-text-strong-950">
            {area ? area.name : process.name}
          </span>
          {area && (
            <>
              <span className="text-[12px] tracking-[-0.143px] text-text-sub-600/40">
                /
              </span>
              <span className="max-w-[200px] truncate text-[13px] font-semibold tracking-[-0.143px] text-text-strong-950">
                {process.name}
              </span>
            </>
          )}
          <button
            type="button"
            className="flex items-center text-text-sub-600 transition-colors hover:text-text-strong-950"
          >
            <RiArrowDownSLine className="size-3.5" />
          </button>
          <button
            type="button"
            className="ml-1 text-text-sub-600 transition-colors hover:text-text-strong-950"
          >
            <RiStarLine className="size-3.5" />
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex items-center overflow-x-auto border-b-[0.25px] border-stroke-soft-200 px-10">
          <button
            type="button"
            className="relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950 h-[35.5px]"
          >
            <RiChat1Line className="size-4" />
            Canal
          </button>
          <button
            type="button"
            onClick={() => setActiveViewId('list')}
            onContextMenu={(e) => handleViewContextMenu(e, 'list')}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors h-[35.5px] ${
              activeViewId === 'list'
                ? 'text-text-strong-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-text-strong-950'
                : 'text-text-sub-600 hover:text-text-strong-950'
            }`}
          >
            <RiListCheck2 className="size-4" />
            List
            <RiPushpinLine className="size-3" />
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
                className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-text-strong-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-text-strong-950'
                    : 'text-text-sub-600 hover:text-text-strong-950'
                }`}
              >
                <Icon className="size-4" />
                {view.name}
              </button>
            );
          })}
          <NewViewPopover
            processId={process.id}
            trigger={
              <button
                type="button"
                className="flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950"
              >
                <RiAddLine className="size-3.5" />
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
                <ProcessCardListBody
                  process={processSummary}
                  departmentId={dept.id}
                  areaId={area?.id ?? null}
                />
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
            isLoading={isDataLoading || boardStatusesQuery.isLoading}
          />
        </div>
      )}

      {activeCustomView &&
        activeCustomView.viewType !== 'LIST' &&
        activeCustomView.viewType !== 'BOARD' && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
            {(() => {
              const Icon = VIEW_TYPE_ICON[activeCustomView.viewType];
              return <Icon className="size-8" />;
            })()}
            <p className="text-paragraph-sm">
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
