'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
} from '@remixicon/react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useWorkItemsGrouped } from '@/features/work-items/hooks/use-work-items';
import { ProcessCard } from '@/features/work-items/components/process-card';
import { ProcessToolbar } from '@/features/work-items/components/process-toolbar';
import type {
  SidebarDepartment,
  SidebarArea,
  SidebarProcess,
} from '@/features/navigation/types/navigation.types';
import type { ProcessSummaryList } from '@/features/navigation/types/process-summary.types';

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
  const { data: sidebarTree, isLoading: isTreeLoading } = useSidebarTree();

  const [activeView, setActiveView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const match = useMemo(
    () => findProcess(sidebarTree, params.deptSlug, params.processSlug),
    [sidebarTree, params.deptSlug, params.processSlug],
  );

  const { data: groupedData, isLoading: isDataLoading } = useWorkItemsGrouped(
    match?.process.id ?? '',
    'status',
  );

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
      {/* Page Header */}
      <div className="border-b-[0.8px] border-stroke-soft-200">
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
        <nav className="flex items-center overflow-x-auto border-b-[0.8px] border-stroke-soft-200 px-10">
          <button
            type="button"
            className="relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950 h-[35.5px]"
          >
            <RiChat1Line className="size-4" />
            Canal
          </button>
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors h-[35.5px] ${
              activeView === 'list'
                ? 'text-text-strong-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-text-strong-950'
                : 'text-text-sub-600 hover:text-text-strong-950'
            }`}
          >
            <RiListCheck2 className="size-4" />
            List
            <RiPushpinLine className="size-3" />
          </button>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950 h-[35.5px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiAddLine className="size-3.5" />
            Nova Visualização
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeView === 'list' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <ProcessToolbar
            search={search}
            onSearchChange={setSearch}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
            closedCount={closedCount}
          />

          {/* Content: Single ProcessCard */}
          <div className="flex w-full flex-1 flex-col gap-4 overflow-auto pb-24">
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
              <div className="space-y-4 py-4">
                <ProcessCard
                  process={processSummary}
                  parentName={area?.name ?? dept.name}
                  deptSlug={dept.slug}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {activeView === 'board' && (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
          <RiLayoutColumnLine className="size-8" />
          <p className="text-paragraph-sm">Visualização Board em breve.</p>
        </div>
      )}
    </div>
  );
}
