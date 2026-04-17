'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  RiStarLine,
  RiArrowDownSLine,
  RiFolderOpenLine,
} from '@remixicon/react';
import { ProcessListView } from '@/features/work-items/components/process-list-view';
import { useAreaDetail } from '@/features/navigation/hooks/use-area-detail';
import { useAreaSummaries } from '@/features/navigation/hooks/use-area-summaries';

export default function AreaPage() {
  const params = useParams<{ deptSlug: string; areaSlug: string }>();
  const { data: area, isLoading: isAreaLoading } = useAreaDetail(
    params.areaSlug,
  );
  const { data: summaries, isLoading: isSummariesLoading } =
    useAreaSummaries(area?.id ?? '', false);

  if (isAreaLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-10 w-96 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-12 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-weak-50" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
        <p className="text-paragraph-sm">Área não encontrada.</p>
      </div>
    );
  }

  return (
    <ProcessListView
      header={
        <header className="flex items-center gap-[6px] px-10 py-4">
          <Link
            href={`/d/${area.departmentSlug}`}
            className="max-w-[200px] truncate text-[13px] font-normal tracking-[-0.143px] text-text-sub-600 transition-colors hover:text-text-strong-950"
          >
            {area.departmentName}
          </Link>
          <span className="text-[12px] tracking-[-0.143px] text-text-sub-600/40">
            /
          </span>
          <RiFolderOpenLine className="size-4 text-text-sub-600" />
          <span className="max-w-[200px] truncate text-[13px] font-semibold tracking-[-0.143px] text-text-strong-950">
            {area.name}
          </span>
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
      }
      summaries={summaries}
      isSummariesLoading={isSummariesLoading}
      parentNameFn={() => area.name}
      deptSlug={area.departmentSlug}
      emptyMessage="Nenhum processo nesta área."
    />
  );
}
