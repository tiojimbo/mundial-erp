'use client';

import * as Badge from '@/components/ui/badge';
import type { ProductionOrderStatus, SeparationOrderStatus } from '../types/production.types';
import { PO_STATUS_LABELS, SO_STATUS_LABELS } from '../types/production.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const PO_BADGE_MAP: Record<ProductionOrderStatus, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  PENDING: { color: 'orange', variant: 'lighter' },
  IN_PROGRESS: { color: 'purple', variant: 'light' },
  COMPLETED: { color: 'green', variant: 'lighter' },
  CANCELLED: { color: 'red', variant: 'lighter' },
};

const SO_BADGE_MAP: Record<SeparationOrderStatus, { color: BadgeColor; variant: 'filled' | 'light' | 'lighter' }> = {
  PENDING: { color: 'orange', variant: 'lighter' },
  IN_PROGRESS: { color: 'purple', variant: 'light' },
  SEPARATED: { color: 'teal', variant: 'lighter' },
  CHECKED: { color: 'green', variant: 'filled' },
};

export function POStatusBadge({ status }: { status: ProductionOrderStatus }) {
  const config = PO_BADGE_MAP[status] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };
  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      <Badge.Dot />
      {PO_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}

export function SOStatusBadge({ status }: { status: SeparationOrderStatus }) {
  const config = SO_BADGE_MAP[status] ?? { color: 'gray' as BadgeColor, variant: 'lighter' as const };
  return (
    <Badge.Root color={config.color} variant={config.variant} size='small'>
      <Badge.Dot />
      {SO_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}
