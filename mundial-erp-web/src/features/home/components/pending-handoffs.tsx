'use client';

import { useState } from 'react';
import { RiExchangeLine } from '@remixicon/react';
import {
  usePendingHandoffs,
  useAcceptHandoff,
  useRejectHandoff,
} from '../hooks/use-pending-handoffs';
import { HandoffCard } from './handoff-card';

export function PendingHandoffs() {
  const { data, isLoading } = usePendingHandoffs();
  const acceptMutation = useAcceptHandoff();
  const rejectMutation = useRejectHandoff();
  const [activeHandoffId, setActiveHandoffId] = useState<string | null>(null);
  const handoffs = data?.handoffs ?? [];

  function handleAccept(id: string) {
    setActiveHandoffId(id);
    acceptMutation.mutate(id, {
      onSettled: () => setActiveHandoffId(null),
    });
  }

  function handleReject(id: string) {
    setActiveHandoffId(id);
    rejectMutation.mutate(id, {
      onSettled: () => setActiveHandoffId(null),
    });
  }

  if (isLoading) {
    return (
      <section>
        <h2 className='text-label-md text-text-strong-950'>
          Handoffs pendentes
        </h2>
        <div className='mt-3 space-y-3'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='h-28 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50'
            />
          ))}
        </div>
      </section>
    );
  }

  if (handoffs.length === 0) {
    return (
      <section>
        <h2 className='text-label-md text-text-strong-950'>
          Handoffs pendentes
        </h2>
        <div className='mt-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-8 text-center shadow-regular-xs'>
          <RiExchangeLine className='mx-auto size-8 text-text-soft-400' />
          <p className='mt-2 text-paragraph-sm text-text-soft-400'>
            Nenhum handoff pendente para o seu departamento.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className='text-label-md text-text-strong-950'>
        Handoffs pendentes
        <span className='ml-2 text-paragraph-sm text-text-sub-600'>
          ({handoffs.length})
        </span>
      </h2>
      <div className='mt-3 space-y-3'>
        {handoffs.map((handoff) => (
          <HandoffCard
            key={handoff.id}
            handoff={handoff}
            onAccept={handleAccept}
            onReject={handleReject}
            isAccepting={
              acceptMutation.isPending && activeHandoffId === handoff.id
            }
            isRejecting={
              rejectMutation.isPending && activeHandoffId === handoff.id
            }
          />
        ))}
      </div>
    </section>
  );
}
