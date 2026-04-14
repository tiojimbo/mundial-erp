'use client';

import { QuotationDossier } from '@/features/quotations/components/quotation-dossier';

type Props = { params: { id: string } };

export default function CotacaoDetalhePage({ params }: Props) {
  return <QuotationDossier quotationId={params.id} />;
}
