'use client';

import { InvoiceDetail } from '@/features/financial/components/invoice-detail';

type Props = {
  params: { id: string };
};

export default function NotaFiscalDetalhePage({ params }: Props) {
  return <InvoiceDetail invoiceId={params.id} />;
}
