import { Suspense } from 'react';
import { InboxClient } from '@/features/inbox/components/inbox-client';

export default function CaixaDeEntradaPage() {
  return (
    <Suspense>
      <InboxClient />
    </Suspense>
  );
}
