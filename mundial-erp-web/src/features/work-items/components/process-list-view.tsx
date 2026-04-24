'use client';

import { useMemo, useState } from 'react';
import {
  RiListCheck2,
  RiLayoutColumnLine,
  RiChat1Line,
  RiPushpinLine,
  RiAddLine,
} from '@remixicon/react';
import { ProcessCard } from './process-card';
import { ProcessToolbar } from './process-toolbar';
import type { ProcessSummary } from '@/features/navigation/types/process-summary.types';

type ProcessListViewProps = {
  header: React.ReactNode;
  summaries: ProcessSummary[] | undefined;
  isSummariesLoading: boolean;
  parentNameFn: (process: ProcessSummary) => string;
  deptSlug: string;
  departmentId: string;
  emptyMessage?: string;
  onCreateTask?: () => void;
};

export function ProcessListView({
  header,
  summaries,
  isSummariesLoading,
  parentNameFn,
  deptSlug,
  departmentId,
  emptyMessage = 'Nenhum processo encontrado.',
  onCreateTask,
}: ProcessListViewProps) {
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'board'>('list');

  const filteredSummaries = useMemo(() => {
    if (!summaries) return [];
    if (!search.trim()) return summaries;
    const term = search.toLowerCase();
    return summaries.filter((p) => p.name.toLowerCase().includes(term));
  }, [summaries, search]);

  const closedCount = useMemo(() => {
    if (!summaries) return 0;
    return summaries.reduce((acc, p) => {
      if (p.processType === 'LIST') {
        return (
          acc +
          p.groups
            .filter((g) => g.statusCategory === 'CLOSED')
            .reduce((sum, g) => sum + g.count, 0)
        );
      }
      return acc;
    }, 0);
  }, [summaries]);

  return (
    <div className="relative -m-4 flex min-h-0 flex-1 flex-col overflow-hidden lg:-m-6">
      {/* Page Header */}
      <div className="border-b-[0.8px] border-stroke-soft-200">
        {header}

        {/* Tabs */}
        <nav className="flex items-center overflow-x-auto border-b-[0.25px] border-stroke-soft-200 px-10">
          <button
            type="button"
            className="relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950"
          >
            <RiChat1Line className="size-4" />
            Canal
          </button>
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`relative flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
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
            className="flex h-[35.5px] items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-sub-600 transition-colors hover:text-text-strong-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RiAddLine className="size-3.5" />
            Nova Visualização
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeView === 'list' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ProcessToolbar
            search={search}
            onSearchChange={setSearch}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
            closedCount={closedCount}
            onCreateTask={onCreateTask}
          />

          <div className="flex w-full flex-1 flex-col gap-4 overflow-auto pb-24">
            {isSummariesLoading ? (
              <div className="space-y-4 px-10">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-bg-weak-50"
                  />
                ))}
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
                <p className="text-paragraph-sm">
                  {search
                    ? 'Nenhum processo encontrado para esta busca.'
                    : emptyMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {filteredSummaries.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    parentName={parentNameFn(process)}
                    deptSlug={deptSlug}
                    departmentId={departmentId}
                  />
                ))}
              </div>
            )}
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
