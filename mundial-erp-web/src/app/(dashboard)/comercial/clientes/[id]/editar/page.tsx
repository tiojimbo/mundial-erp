'use client';

import { ClientForm } from '@/features/clients/components/client-form';
import {
  useClient,
  useUpdateClient,
} from '@/features/clients/hooks/use-clients';
import type { ClientFormData } from '@/features/clients/schemas/client.schema';
import { toClientPayload } from '@/features/clients/utils/to-payload';

type EditarClientePageProps = {
  params: { id: string };
};

export default function EditarClientePage({ params }: EditarClientePageProps) {
  const id = params.id;
  const { data: client, isLoading } = useClient(id);
  const updateMutation = useUpdateClient(id);

  function handleSubmit(data: ClientFormData) {
    updateMutation.mutate(toClientPayload(data));
  }

  if (isLoading) {
    return (
      <div className='mx-auto max-w-3xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-96 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!client) {
    return (
      <div className='mx-auto max-w-3xl'>
        <p className='text-paragraph-md text-text-soft-400'>
          Cliente não encontrado.
        </p>
      </div>
    );
  }

  return (
    <ClientForm
      defaultValues={client}
      onSubmit={handleSubmit}
      isLoading={updateMutation.isPending}
      title='Editar Cliente'
    />
  );
}
