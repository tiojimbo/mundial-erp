'use client';

import * as Badge from '@/components/ui/badge';

type Props = {
  totalCents: number;
  paidAmountCents: number;
  paymentProofUrl?: string | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function OrderPaymentBadge({ totalCents, paidAmountCents, paymentProofUrl }: Props) {
  const percentage = totalCents > 0 ? Math.round((paidAmountCents / totalCents) * 100) : 0;

  if (percentage >= 100) {
    return (
      <Badge.Root color='green' variant='light' size='medium'>
        <Badge.Icon as='i' className='ri-checkbox-circle-line' />
        100% pago ({formatCurrency(paidAmountCents)})
      </Badge.Root>
    );
  }

  if (percentage > 0) {
    return (
      <div className='flex items-center gap-2'>
        <Badge.Root color='orange' variant='light' size='medium'>
          <Badge.Icon as='i' className='ri-time-line' />
          {percentage}% pago ({formatCurrency(paidAmountCents)})
        </Badge.Root>
        {paymentProofUrl && (
          <a
            href={paymentProofUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-label-xs text-primary-base hover:underline'
          >
            Ver comprovante
          </a>
        )}
      </div>
    );
  }

  return (
    <Badge.Root color='gray' variant='lighter' size='medium'>
      <Badge.Icon as='i' className='ri-money-dollar-circle-line' />
      Aguardando pagamento
    </Badge.Root>
  );
}
