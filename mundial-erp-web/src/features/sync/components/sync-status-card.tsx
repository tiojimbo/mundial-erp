'use client';

import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiTimeLine,
} from '@remixicon/react';
import * as StatusBadge from '@/components/ui/status-badge';
import type { SyncEntityStatus, SyncStatus } from '../types/sync.types';
import { SYNC_ENTITY_LABELS, SYNC_STATUS_LABELS } from '../types/sync.types';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca sincronizado';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `${diffMin}min atr\u00e1s`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atr\u00e1s`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atr\u00e1s`;
}

function getStatusBadgeProps(status: SyncStatus | null) {
  switch (status) {
    case 'SUCCESS':
      return { status: 'completed' as const, variant: 'light' as const };
    case 'IN_PROGRESS':
      return { status: 'pending' as const, variant: 'light' as const };
    case 'FAILED':
      return { status: 'failed' as const, variant: 'light' as const };
    default:
      return { status: 'disabled' as const, variant: 'light' as const };
  }
}

function getStatusIcon(status: SyncStatus | null) {
  switch (status) {
    case 'SUCCESS':
      return <RiCheckboxCircleLine className="size-4 text-success-base" />;
    case 'IN_PROGRESS':
      return <RiLoader4Line className="size-4 animate-spin text-warning-base" />;
    case 'FAILED':
      return <RiErrorWarningLine className="size-4 text-error-base" />;
    default:
      return <RiTimeLine className="size-4 text-text-soft-400" />;
  }
}

type SyncStatusCardProps = {
  entity: SyncEntityStatus;
};

export function SyncStatusCard({ entity }: SyncStatusCardProps) {
  const badgeProps = getStatusBadgeProps(entity.lastStatus);

  return (
    <div className="flex items-center justify-between rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-xs">
      <div className="flex items-center gap-3">
        {getStatusIcon(entity.lastStatus)}
        <div>
          <p className="text-label-sm text-text-strong-950">
            {SYNC_ENTITY_LABELS[entity.entity]}
          </p>
          <p className="text-paragraph-xs text-text-sub-600">
            {formatRelativeTime(entity.lastSyncAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-paragraph-xs text-text-soft-400">
          {entity.totalMapped} registros
        </span>
        <StatusBadge.Root {...badgeProps}>
          <StatusBadge.Dot />
          {entity.lastStatus ? SYNC_STATUS_LABELS[entity.lastStatus] : 'Pendente'}
        </StatusBadge.Root>
      </div>
    </div>
  );
}
