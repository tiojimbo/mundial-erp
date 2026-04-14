'use client';

import { SupplierForm } from '@/features/suppliers/components/supplier-form';
import { useCreateSupplier } from '@/features/suppliers/hooks/use-suppliers';
import type { SupplierFormData } from '@/features/suppliers/schemas/supplier.schema';
import { toSupplierPayload } from '@/features/suppliers/utils/to-payload';

export default function NovoFornecedorPage() {
  const createMutation = useCreateSupplier();

  function handleSubmit(data: SupplierFormData) {
    createMutation.mutate(toSupplierPayload(data));
  }

  return (
    <SupplierForm
      onSubmit={handleSubmit}
      isLoading={createMutation.isPending}
      title='Novo Fornecedor'
    />
  );
}
