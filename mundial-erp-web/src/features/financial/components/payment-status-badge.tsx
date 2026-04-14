'use client';

import * as Badge from '@/components/ui/badge';
import type { PaymentStatus } from '../types/financial.types';
import { PAYMENT_STATUS_LABELS } from '../types/financial.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const STATUS_COLOR_MAP: Record<PaymentStatus, BadgeColor> = {
  PENDING: 'orange',
  PARTIAL: 'yellow',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'gray',
};

type Props = {
  status: PaymentStatus;
};

export function PaymentStatusBadge({ status }: Props) {
  return (
    <Badge.Root
      color={STATUS_COLOR_MAP[status]}
      variant='lighter'
      size='small'
    >
      <Badge.Dot />
      {PAYMENT_STATUS_LABELS[status]}
    </Badge.Root>
  );
}
