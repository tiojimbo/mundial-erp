'use client';

import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftSLine, RiEyeLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { DashboardGrid } from '@/features/dashboards/components/dashboard-grid';
import { useDashboard } from '@/features/dashboards/hooks/use-dashboards';

export default function EditarPainelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: dashboard, isLoading } = useDashboard(params.id);

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
            onClick={() => router.push(`/paineis/${params.id}`)}
          >
            <Button.Icon as={RiArrowLeftSLine} />
          </Button.Root>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>
              Editando: {dashboard.name}
            </h1>
            <p className='text-paragraph-sm text-text-sub-600'>
              Arraste e redimensione os cards. Adicione novos cards ao dashboard.
            </p>
          </div>
        </div>
        <Button.Root
          variant='primary'
          mode='filled'
          size='small'
          onClick={() => router.push(`/paineis/${params.id}`)}
        >
          <Button.Icon as={RiEyeLine} />
          Visualizar
        </Button.Root>
      </div>

      {/* Grid in edit mode */}
      <DashboardGrid dashboard={dashboard} isEditing={true} />
    </div>
  );
}
