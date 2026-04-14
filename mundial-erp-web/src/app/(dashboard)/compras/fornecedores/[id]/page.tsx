'use client';

import { SupplierDetail } from '@/features/suppliers/components/supplier-detail';

type FornecedorDetalhePageProps = {
  params: { id: string };
};

export default function FornecedorDetalhePage({ params }: FornecedorDetalhePageProps) {
  return <SupplierDetail supplierId={params.id} />;
}
