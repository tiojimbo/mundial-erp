'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  RiArrowLeftSLine,
  RiEditLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { DashboardGrid } from '@/features/dashboards/components/dashboard-grid';
import {
  useDashboard,
  useDeleteDashboard,
} from '@/features/dashboards/hooks/use-dashboards';

export default function PainelViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: dashboard, isLoading } = useDashboard(params.id);
  const deleteDashboard = useDeleteDashboard();

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl space-y-6'>
        <div className='h-10 w-64 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-96 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-text-soft-400'>
        <p className='text-paragraph-sm'>Painel não encontrado.</p>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='small'
          className='mt-4'
          onClick={() => router.push('/paineis')}
        >
          Voltar
        </Button.Root>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root
            variant='neutral'
            mode='ghost'
            size='xsmall'
            onClick={() => router.push('/paineis')}
          >
            <Button.Icon as={RiArrowLeftSLine} />
          </Button.Root>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>
              {dashboard.name}
            </h1>
            {dashboard.description && (
              <p className='text-paragraph-sm text-text-sub-600'>
                {dashboard.description}
              </p>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => router.push(`/paineis/${params.id}/editar`)}
          >
            <Button.Icon as={RiEditLine} />
            Editar
          </Button.Root>
          <Button.Root
            variant='error'
            mode='ghost'
            size='small'
            onClick={() => {
              if (confirm('Remover este painel?')) {
                deleteDashboard.mutate(params.id);
              }
            }}
          >
            <Button.Icon as={RiDeleteBinLine} />
          </Button.Root>
        </div>
      </div>

      {/* Grid */}
      <DashboardGrid dashboard={dashboard} isEditing={false} />
    </div>
  );
}
