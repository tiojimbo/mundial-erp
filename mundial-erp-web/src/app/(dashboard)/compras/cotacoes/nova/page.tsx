'use client';

import { QuotationForm } from '@/features/quotations/components/quotation-form';
import { useCreateQuotation } from '@/features/quotations/hooks/use-quotations';
import { toQuotationPayload } from '@/features/quotations/utils/to-payload';
import { useSupplierLookup, useProductLookup } from '@/features/quotations/hooks/use-quotation-lookups';
import type { QuotationFormData } from '@/features/quotations/schemas/quotation.schema';

export default function NovaCotacaoPage() {
  const createMutation = useCreateQuotation();
  const { data: suppliers } = useSupplierLookup();
  const { data: products } = useProductLookup();

  function handleSubmit(data: QuotationFormData) {
    createMutation.mutate(toQuotationPayload(data));
  }

  return (
    <QuotationForm
      onSubmit={handleSubmit}
      isLoading={createMutation.isPending}
      suppliers={suppliers}
      products={products}
    />
  );
}
