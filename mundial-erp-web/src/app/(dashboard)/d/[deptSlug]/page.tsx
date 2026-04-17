'use client';

import { useParams } from 'next/navigation';
import { RiStarLine, RiArrowDownSLine } from '@remixicon/react';
import { ProcessListView } from '@/features/work-items/components/process-list-view';
import { useDepartmentDetail } from '@/features/navigation/hooks/use-department-detail';
import { useDepartmentSummaries } from '@/features/navigation/hooks/use-department-summaries';
import type { ProcessSummary } from '@/features/navigation/types/process-summary.types';

export default function DepartmentPage() {
  const params = useParams<{ deptSlug: string }>();
  const { data: department, isLoading: isDeptLoading } = useDepartmentDetail(
    params.deptSlug,
  );
  const { data: summaries, isLoading: isSummariesLoading } =
    useDepartmentSummaries(department?.id ?? '', false);

  if (isDeptLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-10 w-96 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-12 animate-pulse rounded-lg bg-bg-weak-50" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-weak-50" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400">
        <p className="text-paragraph-sm">Departamento não encontrado.</p>
      </div>
    );
  }

  return (
    <ProcessListView
      header={
        <header className="flex items-center gap-[6px] px-10 py-4">
          {department.icon && (
            <span className="mr-0.5 text-base">{department.icon}</span>
          )}
          <span className="max-w-[300px] truncate text-[13px] font-semibold tracking-[-0.143px] text-text-strong-950">
            {department.name}
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
      parentNameFn={(process: ProcessSummary) =>
        process.areaName
          ? `${department.name} > ${process.areaName}`
          : department.name
      }
      deptSlug={department.slug}
      emptyMessage="Nenhum processo neste departamento."
    />
  );
}
