'use client';

import { OrderDossier } from '@/features/orders/components/order-dossier';

type PedidoDetalhPageProps = {
  params: { id: string };
};

export default function PedidoDetalhePage({ params }: PedidoDetalhPageProps) {
  return <OrderDossier orderId={params.id} />;
}
