'use client';

import { RequisitionDetail } from '@/features/stock-requisitions/components/requisition-detail';

type Props = { params: { id: string } };

export default function RequisicaoDetalhePage({ params }: Props) {
  return <RequisitionDetail requisitionId={params.id} />;
}
