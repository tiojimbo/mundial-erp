'use client';

import { useRouter } from 'next/navigation';
import { RiArrowLeftSLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { DashboardForm } from '@/features/dashboards/components/dashboard-form';
import { useCreateDashboard } from '@/features/dashboards/hooks/use-dashboards';
import type { DashboardFormData } from '@/features/dashboards/schemas/dashboard.schema';

export default function NovoPainelPage() {
  const router = useRouter();
  const createDashboard = useCreateDashboard();

  function handleSubmit(data: DashboardFormData) {
    createDashboard.mutate({
      name: data.name,
      description: data.description || undefined,
      isPublic: data.isPublic,
    });
  }

  return (
    <div className='mx-auto max-w-xl space-y-6'>
      <div className='flex items-center gap-3'>
        <Button.Root
          variant='neutral'
          mode='ghost'
          size='xsmall'
          onClick={() => router.back()}
        >
          <Button.Icon as={RiArrowLeftSLine} />
        </Button.Root>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Novo Painel</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Crie um dashboard personalizado.
          </p>
        </div>
      </div>

      <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-6'>
        <DashboardForm
          onSubmit={handleSubmit}
          isLoading={createDashboard.isPending}
          submitLabel='Criar Painel'
        />
      </div>
    </div>
  );
}
