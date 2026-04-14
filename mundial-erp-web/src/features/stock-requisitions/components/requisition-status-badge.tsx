'use client';

import * as Badge from '@/components/ui/badge';
import type { RequisitionStatus, RequisitionType } from '../types/stock-requisition.types';
import { REQUISITION_STATUS_LABELS, REQUISITION_TYPE_LABELS } from '../types/stock-requisition.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const STATUS_BADGE_MAP: Record<RequisitionStatus, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  PENDING: { color: 'yellow', variant: 'lighter' },
  APPROVED: { color: 'blue', variant: 'lighter' },
  PROCESSED: { color: 'green', variant: 'lighter' },
  CANCELLED: { color: 'red', variant: 'lighter' },
};

const TYPE_BADGE_MAP: Record<RequisitionType, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  VENDA: { color: 'purple', variant: 'lighter' },
  INTERNO: { color: 'sky', variant: 'lighter' },
};

export function RequisitionStatusBadge({ status }: { status: RequisitionStatus }) {
  const config = STATUS_BADGE_MAP[status] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };

  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      <Badge.Dot />
      {REQUISITION_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}

export function RequisitionTypeBadge({ type }: { type: RequisitionType }) {
  const config = TYPE_BADGE_MAP[type] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };

  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      {REQUISITION_TYPE_LABELS[type] ?? type}
    </Badge.Root>
  );
}
