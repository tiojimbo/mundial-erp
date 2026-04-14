'use client';

import { RequisitionForm } from '@/features/stock-requisitions/components/requisition-form';
import { useCreateRequisition } from '@/features/stock-requisitions/hooks/use-stock-requisitions';
import { toRequisitionPayload } from '@/features/stock-requisitions/utils/to-payload';
import { useProductLookup } from '@/features/quotations/hooks/use-quotation-lookups';
import type { RequisitionFormData } from '@/features/stock-requisitions/schemas/stock-requisition.schema';

export default function NovaRequisicaoPage() {
  const createMutation = useCreateRequisition();
  const { data: products } = useProductLookup();

  function handleSubmit(data: RequisitionFormData) {
    createMutation.mutate(toRequisitionPayload(data));
  }

  return (
    <RequisitionForm
      onSubmit={handleSubmit}
      isLoading={createMutation.isPending}
      products={products}
    />
  );
}
