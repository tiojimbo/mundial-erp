'use client';

import { useState, useMemo } from 'react';
import { RiExchangeLine } from '@remixicon/react';
import { SyncHealthHeader } from './sync-health-header';
import { SyncTriggerPanel } from './sync-trigger-panel';
import { SyncStatusCard } from './sync-status-card';
import { SyncLogsTable } from './sync-logs-table';
import { useSyncStatus } from '../hooks/use-sync';
import type { SyncEntity, SyncStatus as SyncStatusType } from '../types/sync.types';

const SYNC_ENTITY_ORDER: SyncEntity[] = [
  'COMPANY',
  'CLIENT_CLASSIFICATION',
  'DELIVERY_ROUTE',
  'PAYMENT_METHOD',
  'CARRIER',
  'ORDER_TYPE',
  'ORDER_FLOW',
  'ORDER_MODEL',
  'CLIENT',
  'ORDER',
];

const SYNC_ORDER_MAP = new Map(
  SYNC_ENTITY_ORDER.map((entity, index) => [entity, index]),
);

export function SyncDashboard() {
  const { data: status } = useSyncStatus();
  const [logEntityFilter, setLogEntityFilter] = useState<SyncEntity | undefined>();
  const [logStatusFilter, setLogStatusFilter] = useState<SyncStatusType | undefined>();

  const entities = status?.entities ?? [];
  const sortedEntities = useMemo(
    () =>
      [...entities].sort(
        (a, b) => (SYNC_ORDER_MAP.get(a.entity) ?? 99) - (SYNC_ORDER_MAP.get(b.entity) ?? 99),
      ),
    [entities],
  );

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full border border-stroke-soft-200 shadow-xs">
          <RiExchangeLine className="size-6 text-text-sub-600" />
        </div>
        <div>
          <h1 className="text-label-lg text-text-strong-950">Integração Pro Finanças</h1>
          <p className="text-paragraph-sm text-text-sub-600">
            Monitore e controle a sincronização de dados com o Pro Finanças.
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <SyncHealthHeader />

      {/* Trigger Panel */}
      <SyncTriggerPanel />

      {/* Entity Status Grid */}
      <div>
        <h3 className="mb-3 text-label-md text-text-strong-950">Status por Entidade</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEntities.map((entity) => (
            <SyncStatusCard key={entity.entity} entity={entity} />
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-label-md text-text-strong-950">Histórico de Sincronizações</h3>
          <div className="flex gap-2">
            <select
              value={logEntityFilter ?? ''}
              onChange={(e) => setLogEntityFilter(e.target.value as SyncEntity || undefined)}
              className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-paragraph-sm text-text-sub-600 shadow-xs"
            >
              <option value="">Todas entidades</option>
              <option value="CLIENT">Clientes</option>
              <option value="ORDER">Pedidos</option>
              <option value="COMPANY">Empresas</option>
              <option value="CARRIER">Transportadoras</option>
              <option value="PAYMENT_METHOD">Formas de Pagamento</option>
              <option value="CLIENT_CLASSIFICATION">Classificações</option>
              <option value="DELIVERY_ROUTE">Rotas</option>
              <option value="ORDER_TYPE">Tipos de Pedido</option>
              <option value="ORDER_FLOW">Fluxos</option>
              <option value="ORDER_MODEL">Modelos</option>
            </select>
            <select
              value={logStatusFilter ?? ''}
              onChange={(e) => setLogStatusFilter(e.target.value as SyncStatusType || undefined)}
              className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-paragraph-sm text-text-sub-600 shadow-xs"
            >
              <option value="">Todos status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="SUCCESS">Sucesso</option>
              <option value="FAILED">Falhou</option>
            </select>
          </div>
        </div>
        <SyncLogsTable entityFilter={logEntityFilter} statusFilter={logStatusFilter} />
      </div>
    </div>
  );
}
