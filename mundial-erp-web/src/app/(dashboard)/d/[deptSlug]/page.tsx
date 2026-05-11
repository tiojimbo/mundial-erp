'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BreadcrumbTrail } from '@/components/layout/breadcrumb-trail';
import { ProcessListView } from '@/features/work-items/components/process-list-view';
import { useDepartmentDetail } from '@/features/navigation/hooks/use-department-detail';
import { useDepartmentSummaries } from '@/features/navigation/hooks/use-department-summaries';
import type { ProcessSummary } from '@/features/navigation/types/process-summary.types';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';

export default function DepartmentPage() {
  const params = useParams<{ deptSlug: string }>();
  const router = useRouter();
  const { data: department, isLoading: isDeptLoading } = useDepartmentDetail(
    params.deptSlug,
  );
  const { data: summaries, isLoading: isSummariesLoading } =
    useDepartmentSummaries(department?.id ?? '', false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    <>
      <ProcessListView
        header={
          <BreadcrumbTrail
            items={[{ label: department.name }]}
            favorite={{ active: false }}
          />
        }
        summaries={summaries}
        isSummariesLoading={isSummariesLoading}
        parentNameFn={(process: ProcessSummary) =>
          process.areaName
            ? `${department.name} > ${process.areaName}`
            : department.name
        }
        deptSlug={department.slug}
        departmentId={department.id}
        emptyMessage="Nenhum processo neste departamento."
        onCreateTask={() => setIsCreateOpen(true)}
      />
      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        departmentId={department.id}
        onCreated={(taskId) => router.push(`/tasks/${taskId}`)}
      />
    </>
  );
}
