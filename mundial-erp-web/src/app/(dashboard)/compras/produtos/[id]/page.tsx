'use client';

import { ProductDetail } from '@/features/products/components/product-detail';

type ProdutoDetalhePageProps = {
  params: { id: string };
};

export default function ProdutoDetalhePage({ params }: ProdutoDetalhePageProps) {
  return <ProductDetail productId={params.id} />;
}
