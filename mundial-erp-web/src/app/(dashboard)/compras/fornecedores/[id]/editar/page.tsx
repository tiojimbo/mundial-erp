'use client';

import { SupplierForm } from '@/features/suppliers/components/supplier-form';
import {
  useSupplier,
  useUpdateSupplier,
} from '@/features/suppliers/hooks/use-suppliers';
import type { SupplierFormData } from '@/features/suppliers/schemas/supplier.schema';
import { toSupplierPayload } from '@/features/suppliers/utils/to-payload';

type EditarFornecedorPageProps = {
  params: { id: string };
};

export default function EditarFornecedorPage({ params }: EditarFornecedorPageProps) {
  const id = params.id;
  const { data: supplier, isLoading } = useSupplier(id);
  const updateMutation = useUpdateSupplier(id);

  function handleSubmit(data: SupplierFormData) {
    updateMutation.mutate(toSupplierPayload(data));
  }

  if (isLoading) {
    return (
      <div className='mx-auto max-w-3xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-96 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className='mx-auto max-w-3xl'>
        <p className='text-paragraph-md text-text-soft-400'>
          Fornecedor não encontrado.
        </p>
      </div>
    );
  }

  return (
    <SupplierForm
      defaultValues={supplier}
      onSubmit={handleSubmit}
      isLoading={updateMutation.isPending}
      title='Editar Fornecedor'
    />
  );
}
