'use client';

import { ARDetail } from '@/features/financial/components/ar-detail';

type Props = {
  params: { id: string };
};

export default function ContaReceberDetalhePage({ params }: Props) {
  return <ARDetail arId={params.id} />;
}
