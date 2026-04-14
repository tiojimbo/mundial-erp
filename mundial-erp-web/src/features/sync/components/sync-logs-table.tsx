'use client';

import { useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as StatusBadge from '@/components/ui/status-badge';
import * as Pagination from '@/components/ui/pagination';
import { useSyncLogs } from '../hooks/use-sync';
import {
  SYNC_ENTITY_LABELS,
  SYNC_STATUS_LABELS,
  type SyncEntity,
  type SyncLogFilters,
  type SyncStatus,
} from '../types/sync.types';

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeProps(status: SyncStatus) {
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

type SyncLogsTableProps = {
  entityFilter?: SyncEntity;
  statusFilter?: SyncStatus;
};

export function SyncLogsTable({ entityFilter, statusFilter }: SyncLogsTableProps) {
  const [page, setPage] = useState(1);
  const filters: SyncLogFilters = {
    page,
    limit: 10,
    entity: entityFilter,
    status: statusFilter,
    sortBy: 'startedAt',
    sortOrder: 'desc',
  };

  const { data, isLoading } = useSyncLogs(filters);

  if (isLoading) {
    return (
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Entidade</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Registros</Table.Head>
            <Table.Head>Sincronizados</Table.Head>
            <Table.Head>Falhas</Table.Head>
            <Table.Head>Inicio</Table.Head>
            <Table.Head>Conclusao</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Array.from({ length: 5 }).map((_, i) => (
            <Table.Row key={i}>
              {Array.from({ length: 7 }).map((__, j) => (
                <Table.Cell key={j}>
                  <div className="h-4 w-20 animate-pulse rounded bg-bg-weak-50" />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  const logs = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  if (logs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-stroke-soft-200">
        <p className="text-paragraph-sm text-text-soft-400">Nenhum log de sincronização encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-stroke-soft-200">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Entidade</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Registros</Table.Head>
              <Table.Head>Sincronizados</Table.Head>
              <Table.Head>Falhas</Table.Head>
              <Table.Head>Início</Table.Head>
              <Table.Head>Conclusão</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {logs.map((log) => {
              const badgeProps = getStatusBadgeProps(log.status);
              return (
                <Table.Row key={log.id}>
                  <Table.Cell className="text-label-sm text-text-strong-950">
                    {SYNC_ENTITY_LABELS[log.entity]}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge.Root {...badgeProps}>
                      <StatusBadge.Dot />
                      {SYNC_STATUS_LABELS[log.status]}
                    </StatusBadge.Root>
                  </Table.Cell>
                  <Table.Cell>{log.totalRecords}</Table.Cell>
                  <Table.Cell>{log.syncedRecords}</Table.Cell>
                  <Table.Cell>
                    {log.failedRecords > 0 ? (
                      <span className="text-error-base">{log.failedRecords}</span>
                    ) : (
                      log.failedRecords
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-paragraph-xs text-text-sub-600">
                    {formatDateTime(log.startedAt)}
                  </Table.Cell>
                  <Table.Cell className="text-paragraph-xs text-text-sub-600">
                    {log.completedAt ? formatDateTime(log.completedAt) : '-'}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination.Root>
            <Pagination.NavButton
              onClick={() => setPage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
            >
              <Pagination.NavIcon as={RiArrowLeftSLine} />
            </Pagination.NavButton>
            {getPageNumbers(pagination.page, pagination.totalPages).map(
              (p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-text-soft-400">...</span>
                ) : (
                  <Pagination.Item
                    key={p}
                    current={p === pagination.page}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Pagination.Item>
                ),
            )}
            <Pagination.NavButton
              onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <Pagination.NavIcon as={RiArrowRightSLine} />
            </Pagination.NavButton>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
}
