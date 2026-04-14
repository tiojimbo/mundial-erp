'use client';

import { ProductWizard } from '@/features/products/components/product-wizard';
import { useCreateProduct } from '@/features/products/hooks/use-products';
import type { ProductFormData } from '@/features/products/schemas/product.schema';
import { toProductPayload } from '@/features/products/utils/to-payload';

export default function NovoProdutoPage() {
  const createMutation = useCreateProduct();

  function handleSubmit(data: ProductFormData) {
    createMutation.mutate(toProductPayload(data));
  }

  return (
    <ProductWizard
      onSubmit={handleSubmit}
      isLoading={createMutation.isPending}
      title='Novo Produto'
    />
  );
}
