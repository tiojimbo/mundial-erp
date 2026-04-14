'use client';

import * as Badge from '@/components/ui/badge';
import type { QuotationStatus, PurchaseOrderStatus } from '../types/quotation.types';
import { QUOTATION_STATUS_LABELS, PURCHASE_ORDER_STATUS_LABELS } from '../types/quotation.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const QUOTATION_BADGE_MAP: Record<QuotationStatus, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  DRAFT: { color: 'gray', variant: 'lighter' },
  SENT: { color: 'blue', variant: 'lighter' },
  RECEIVED: { color: 'yellow', variant: 'lighter' },
  SELECTED: { color: 'green', variant: 'lighter' },
  REJECTED: { color: 'red', variant: 'lighter' },
};

const PURCHASE_ORDER_BADGE_MAP: Record<PurchaseOrderStatus, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  PENDING: { color: 'yellow', variant: 'lighter' },
  CONFIRMED: { color: 'blue', variant: 'lighter' },
  RECEIVED: { color: 'green', variant: 'lighter' },
  CANCELLED: { color: 'red', variant: 'lighter' },
};

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const config = QUOTATION_BADGE_MAP[status] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };

  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      <Badge.Dot />
      {QUOTATION_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config = PURCHASE_ORDER_BADGE_MAP[status] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };

  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      <Badge.Dot />
      {PURCHASE_ORDER_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}
