'use client';

import {
  RiRefreshLine,
  RiTeamLine,
  RiShoppingBag3Line,
  RiDatabase2Line,
  RiPlayLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import {
  useSyncClients,
  useSyncOrders,
  useSyncReferenceData,
  useSyncAll,
} from '../hooks/use-sync';

export function SyncTriggerPanel() {
  const { notification } = useNotification();
  const syncClients = useSyncClients();
  const syncOrders = useSyncOrders();
  const syncReferenceData = useSyncReferenceData();
  const syncAll = useSyncAll();

  const isAnyLoading =
    syncClients.isPending ||
    syncOrders.isPending ||
    syncReferenceData.isPending ||
    syncAll.isPending;

  function handleSync(
    action: () => void,
    label: string,
  ) {
    action();
    notification({
      title: 'Sync iniciado',
      description: `Sincronização de ${label} foi enfileirada.`,
      status: 'information',
    });
  }

  const triggers = [
    {
      label: 'Dados de Referência',
      description: 'Empresas, transportadoras, formas de pagamento, classificações, rotas, tipos/fluxos/modelos',
      icon: RiDatabase2Line,
      action: () => handleSync(() => syncReferenceData.mutate(), 'dados de referência'),
      isLoading: syncReferenceData.isPending,
    },
    {
      label: 'Clientes',
      description: 'Sincronizar cadastro de clientes do Pro Finanças',
      icon: RiTeamLine,
      action: () => handleSync(() => syncClients.mutate(), 'clientes'),
      isLoading: syncClients.isPending,
    },
    {
      label: 'Pedidos',
      description: 'Sincronizar pedidos e itens do Pro Finanças',
      icon: RiShoppingBag3Line,
      action: () => handleSync(() => syncOrders.mutate(), 'pedidos'),
      isLoading: syncOrders.isPending,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-label-md text-text-strong-950">Sincronização Manual</h3>
          <p className="text-paragraph-sm text-text-sub-600">
            Dispare a sincronização por entidade ou completa.
          </p>
        </div>
        <Button.Root
          variant="primary"
          mode="filled"
          size="medium"
          onClick={() => handleSync(() => syncAll.mutate(), 'completa')}
          disabled={isAnyLoading}
        >
          {syncAll.isPending ? (
            <RiRefreshLine className="size-5 animate-spin" />
          ) : (
            <Button.Icon as={RiPlayLine} />
          )}
          Sync Completo
        </Button.Root>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {triggers.map((trigger) => (
          <button
            key={trigger.label}
            onClick={trigger.action}
            disabled={isAnyLoading}
            className="flex items-start gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 text-left shadow-xs transition-colors hover:bg-bg-weak-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-weak-50">
              {trigger.isLoading ? (
                <RiRefreshLine className="size-5 animate-spin text-primary-base" />
              ) : (
                <trigger.icon className="size-5 text-text-sub-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-label-sm text-text-strong-950">{trigger.label}</p>
              <p className="mt-0.5 text-paragraph-xs text-text-sub-600 line-clamp-2">
                {trigger.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
