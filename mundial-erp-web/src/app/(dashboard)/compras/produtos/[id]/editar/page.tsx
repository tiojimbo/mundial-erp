'use client';

import { ProductWizard } from '@/features/products/components/product-wizard';
import {
  useProduct,
  useUpdateProduct,
} from '@/features/products/hooks/use-products';
import type { ProductFormData } from '@/features/products/schemas/product.schema';
import { toUpdateProductPayload } from '@/features/products/utils/to-payload';

type EditarProdutoPageProps = {
  params: { id: string };
};

export default function EditarProdutoPage({ params }: EditarProdutoPageProps) {
  const id = params.id;
  const { data: product, isLoading } = useProduct(id);
  const updateMutation = useUpdateProduct(id);

  function handleSubmit(data: ProductFormData) {
    updateMutation.mutate(toUpdateProductPayload(data));
  }

  if (isLoading) {
    return (
      <div className='mx-auto max-w-3xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-96 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!product) {
    return (
      <div className='mx-auto max-w-3xl'>
        <p className='text-paragraph-md text-text-soft-400'>
          Produto não encontrado.
        </p>
      </div>
    );
  }

  return (
    <ProductWizard
      defaultValues={product}
      onSubmit={handleSubmit}
      isLoading={updateMutation.isPending}
      title='Editar Produto'
    />
  );
}
