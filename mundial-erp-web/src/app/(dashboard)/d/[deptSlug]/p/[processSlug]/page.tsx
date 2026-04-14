'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { RiAddLine, RiListCheck2, RiLayoutColumnLine } from '@remixicon/react';
import * as TabMenu from '@/components/ui/tab-menu-horizontal';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { useProcessContextStore } from '@/stores/process-context.store';
import { WorkItemListView } from '@/features/work-items/components/work-item-list-view';
import { WorkItemBoardView } from '@/features/work-items/components/work-item-board-view';
import type { SidebarDepartment, SidebarProcess } from '@/features/navigation/types/navigation.types';

/**
 * Find the matching department + process from the sidebar tree using the URL slugs.
 */
function findProcess(
  tree: SidebarDepartment[] | undefined,
  deptSlug: string,
  processSlug: string,
): { dept: SidebarDepartment; process: SidebarProcess } | null {
  if (!tree) return null;
  for (const dept of tree) {
    if (dept.slug !== deptSlug) continue;
    for (const area of dept.areas) {
      for (const process of area.processes) {
        if (process.slug === processSlug) {
          return { dept, process };
        }
      }
    }
  }
  return null;
}

export default function GenericProcessPage() {
  const params = useParams<{ deptSlug: string; processSlug: string }>();
  const { data: sidebarTree, isLoading: isTreeLoading } = useSidebarTree();
  const setBreadcrumbs = useProcessContextStore((s) => s.setBreadcrumbs);
  const clearProcess = useProcessContextStore((s) => s.clearProcess);
  const [activeView, setActiveView] = useState<'list' | 'board'>('list');

  const match = useMemo(
    () => findProcess(sidebarTree, params.deptSlug, params.processSlug),
    [sidebarTree, params.deptSlug, params.processSlug],
  );

  // Set breadcrumbs whenever the matched process changes
  useEffect(() => {
    if (match) {
      setBreadcrumbs([
        { label: match.dept.name },
        { label: match.process.name },
      ]);
    }
    return () => {
      clearProcess();
    };
  }, [match, setBreadcrumbs, clearProcess]);

  // Loading state
  if (isTreeLoading) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='h-8 w-48 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-12 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  // Not found state
  if (!match) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400'>
        <i className='ri-error-warning-line text-3xl' />
        <p className='text-paragraph-sm'>Processo nao encontrado.</p>
      </div>
    );
  }

  const { dept, process } = match;

  return (
    <div className='flex flex-col gap-5'>
      {/* Page title */}
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>
          {process.name}
        </h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          {dept.name}
        </p>
      </div>

      {/* Tabs: List / Board / + Nova Visualizacao */}
      <TabMenu.Root
        value={activeView}
        onValueChange={(v) => setActiveView(v as 'list' | 'board')}
      >
        <TabMenu.List>
          <TabMenu.Trigger value='list'>
            <TabMenu.Icon as={RiListCheck2} />
            Lista
          </TabMenu.Trigger>
          <TabMenu.Trigger value='board'>
            <TabMenu.Icon as={RiLayoutColumnLine} />
            Board
          </TabMenu.Trigger>
          <button
            type='button'
            disabled
            className='flex h-12 items-center gap-1.5 px-2 py-3.5 text-label-sm text-text-disabled-300'
            title='Em breve'
          >
            <RiAddLine className='size-5' />
            Nova Visualizacao
          </button>
        </TabMenu.List>

        <TabMenu.Content value='list' className='pt-4'>
          <WorkItemListView
            processId={process.id}
            departmentId={dept.id}
          />
        </TabMenu.Content>

        <TabMenu.Content value='board' className='pt-4'>
          <WorkItemBoardView
            processId={process.id}
            departmentId={dept.id}
          />
        </TabMenu.Content>
      </TabMenu.Root>
    </div>
  );
}
