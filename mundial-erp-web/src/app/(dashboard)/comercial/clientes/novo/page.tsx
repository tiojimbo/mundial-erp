'use client';

import { ClientForm } from '@/features/clients/components/client-form';
import { useCreateClient } from '@/features/clients/hooks/use-clients';
import type { ClientFormData } from '@/features/clients/schemas/client.schema';
import { toClientPayload } from '@/features/clients/utils/to-payload';

export default function NovoClientePage() {
  const createMutation = useCreateClient();

  function handleSubmit(data: ClientFormData) {
    createMutation.mutate(toClientPayload(data));
  }

  return (
    <ClientForm
      onSubmit={handleSubmit}
      isLoading={createMutation.isPending}
      title='Novo Cliente'
    />
  );
}
