'use client';

import { APDetail } from '@/features/financial/components/ap-detail';

type Props = {
  params: { id: string };
};

export default function ContaPagarDetalhePage({ params }: Props) {
  return <APDetail apId={params.id} />;
}
