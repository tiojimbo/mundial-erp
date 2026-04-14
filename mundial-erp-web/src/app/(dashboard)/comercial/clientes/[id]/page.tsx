'use client';

import { ClientDetail } from '@/features/clients/components/client-detail';

type ClienteDetalhePageProps = {
  params: { id: string };
};

export default function ClienteDetalhePage({ params }: ClienteDetalhePageProps) {
  return <ClientDetail clientId={params.id} />;
}
