'use client';

import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiLoader4Line,
} from '@remixicon/react';
import { useSyncStatus } from '../hooks/use-sync';

export function SyncHealthHeader() {
  const { data: status, isLoading } = useSyncStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-xs">
        <RiLoader4Line className="size-5 animate-spin text-text-soft-400" />
        <p className="text-paragraph-sm text-text-soft-400">Verificando conexão...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-xs">
      <div className="flex items-center gap-2">
        {status?.connected ? (
          <RiCheckboxCircleLine className="size-5 text-success-base" />
        ) : (
          <RiCloseCircleLine className="size-5 text-error-base" />
        )}
        <div>
          <p className="text-label-sm text-text-strong-950">Pro Finanças API</p>
          <p className="text-paragraph-xs text-text-sub-600">
            {status?.connected ? 'Conectado' : 'Desconectado'}
          </p>
        </div>
      </div>

      <div className="h-8 w-px bg-stroke-soft-200" />

      <div>
        <p className="text-paragraph-xs text-text-soft-400">Último sync</p>
        <p className="text-label-sm text-text-strong-950">
          {status?.lastSync
            ? new Date(status.lastSync).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Nunca'}
        </p>
      </div>

      <div className="h-8 w-px bg-stroke-soft-200" />

      <div>
        <p className="text-paragraph-xs text-text-soft-400">Fila</p>
        <p className="text-label-sm text-text-strong-950">
          {status?.queueSize ?? 0} jobs
        </p>
      </div>

      <div className="h-8 w-px bg-stroke-soft-200" />

      <div>
        <p className="text-paragraph-xs text-text-soft-400">Ativos</p>
        <p className="text-label-sm text-text-strong-950">
          {status?.activeJobs ?? 0} jobs
        </p>
      </div>
    </div>
  );
}
