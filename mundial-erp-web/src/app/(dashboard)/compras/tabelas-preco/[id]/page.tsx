'use client';

import { PriceTableEditor } from '@/features/price-tables/components/price-table-editor';

type Props = { params: { id: string } };

export default function TabelaPrecoEditorPage({ params }: Props) {
  return <PriceTableEditor tableId={params.id} />;
}
