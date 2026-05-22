'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Folder } from 'lucide-react';
import { BreadcrumbTrail } from '@/components/layout/breadcrumb-trail';
import { ProcessListView } from '@/features/processes/components/process-list-view';
import { useAreaDetail } from '@/features/navigation/hooks/use-area-detail';
import { useAreaSummaries } from '@/features/navigation/hooks/use-area-summaries';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';

export default function AreaPage() {
  const params = useParams<{ deptSlug: string; areaSlug: string }>();
  const router = useRouter();
  const { data: area, isLoading: isAreaLoading } = useAreaDetail(
    params.areaSlug,
  );
  const { data: summaries, isLoading: isSummariesLoading } = useAreaSummaries(
    area?.id ?? '',
    false,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isAreaLoading) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='h-6 w-64 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-10 w-96 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-12 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (!area) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-20 text-text-soft-400'>
        <p className='text-paragraph-sm'>Área não encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <ProcessListView
        header={
          <BreadcrumbTrail
            items={[
              { label: area.departmentName, href: `/d/${area.departmentSlug}` },
              { label: area.name, icon: Folder },
            ]}
            favoriteTarget={{ entityType: 'FOLDER', entityId: area.id }}
          />
        }
        summaries={summaries}
        isSummariesLoading={isSummariesLoading}
        parentNameFn={() => area.name}
        deptSlug={area.departmentSlug}
        departmentId={area.departmentId}
        emptyMessage='Nenhum processo nesta área.'
        onCreateTask={() => setIsCreateOpen(true)}
        customFieldsScope={{ kind: 'folder', folderId: area.id }}
      />
      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        areaId={area.id}
        onCreated={(taskId) => router.push(`/tasks/${taskId}`)}
      />
    </>
  );
}
