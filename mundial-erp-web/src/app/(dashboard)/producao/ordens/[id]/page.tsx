'use client';

import { ProductionDossier } from '@/features/production/components/production-dossier';

type Props = {
  params: { id: string };
};

export default function ProducaoOrdemDetalhePage({ params }: Props) {
  return <ProductionDossier productionOrderId={params.id} />;
}
