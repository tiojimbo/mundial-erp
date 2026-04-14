'use client';

import Link from 'next/link';
import {
  RiExchangeLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import type { HandoffInstance } from '../types/home.types';

type HandoffCardProps = {
  handoff: HandoffInstance;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isAccepting: boolean;
  isRejecting: boolean;
};

export function HandoffCard({
  handoff,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: HandoffCardProps) {
  return (
    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-regular-xs'>
      <div className='flex items-start gap-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-information-lighter'>
          <RiExchangeLine className='size-4 text-information-base' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-label-sm text-text-strong-950'>
            {handoff.handoffName}
          </p>
          <p className='mt-0.5 truncate text-paragraph-xs text-text-sub-600'>
            {handoff.processName} &middot; {handoff.orderCode}
          </p>
          <p className='mt-0.5 text-paragraph-xs text-text-soft-400'>
            De: {handoff.fromDepartment} &rarr; {handoff.toDepartment}
          </p>
        </div>
        <span className='shrink-0 text-paragraph-xs text-text-soft-400'>
          {formatDateTime(handoff.createdAt)}
        </span>
      </div>

      {handoff.notes && (
        <p className='mt-2 rounded-lg bg-bg-weak-50 px-3 py-2 text-paragraph-xs text-text-sub-600'>
          {handoff.notes}
        </p>
      )}

      <div className='mt-3 flex items-center justify-between'>
        <Link
          href={`/comercial/pedidos/${handoff.orderId}`}
          className='flex items-center text-paragraph-xs text-primary-base transition hover:text-primary-darker'
        >
          Ver dossiê
          <RiArrowRightSLine className='size-4' />
        </Link>
        <div className='flex gap-2'>
          <Button.Root
            variant='error'
            mode='ghost'
            size='xxsmall'
            onClick={() => onReject(handoff.id)}
            disabled={isRejecting || isAccepting}
          >
            <Button.Icon as={RiCloseLine} />
            Rejeitar
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='xxsmall'
            onClick={() => onAccept(handoff.id)}
            disabled={isAccepting || isRejecting}
          >
            <Button.Icon as={RiCheckLine} />
            Aceitar
          </Button.Root>
        </div>
      </div>
    </div>
  );
}
