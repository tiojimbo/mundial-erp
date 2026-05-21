'use client';

import Link from 'next/link';
import {
  RiArrowRightLine,
  RiTimeLine,
  RiExchangeLine,
} from '@remixicon/react';
import * as Tag from '@/components/ui/tag';
import * as Button from '@/components/ui/button';
import type { ProcessSummaryBpm } from '@/features/navigation/types/process-summary.types';

const ORDER_STATUS_LABELS: Record<string, string> = {
  EM_ORCAMENTO: 'Em Orcamento',
  FATURAR: 'Faturar',
  FATURADO: 'Faturado',
  PRODUZIR: 'Produzir',
  EM_PRODUCAO: 'Em Producao',
  PRODUZIDO: 'Produzido',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  EM_ORCAMENTO: 'blue',
  FATURAR: 'orange',
  FATURADO: 'yellow',
  PRODUZIR: 'purple',
  EM_PRODUCAO: 'sky',
  PRODUZIDO: 'green',
  ENTREGUE: 'teal',
  CANCELADO: 'red',
};

type ProcessCardBpmBodyProps = {
  process: ProcessSummaryBpm;
  deptSlug: string;
};

export function ProcessCardBpmBody({ process, deptSlug }: ProcessCardBpmBodyProps) {
  const href = process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;
  const statusEntries = Object.entries(process.ordersByStatus).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className="space-y-3 px-5 pb-4">
      {/* Status badges */}
      {statusEntries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <Tag.Root
              key={status}
              variant="stroke"
              color={(ORDER_STATUS_COLORS[status] as 'blue') ?? 'gray'}
            >
              {ORDER_STATUS_LABELS[status] ?? status}: {count}
            </Tag.Root>
          ))}
        </div>
      ) : (
        <p className="text-paragraph-sm text-text-soft-400">
          Nenhum pedido neste processo.
        </p>
      )}

      {/* Metricas */}
      <div className="flex items-center gap-4 text-paragraph-sm text-text-sub-600">
        {process.pendingActivities > 0 && (
          <span className="flex items-center gap-1">
            <RiTimeLine className="size-3.5 text-text-soft-400" />
            {process.pendingActivities} atividade{process.pendingActivities !== 1 ? 's' : ''} pendente{process.pendingActivities !== 1 ? 's' : ''}
          </span>
        )}
        {process.pendingHandoffs > 0 && (
          <span className="flex items-center gap-1">
            <RiExchangeLine className="size-3.5 text-text-soft-400" />
            {process.pendingHandoffs} handoff{process.pendingHandoffs !== 1 ? 's' : ''} aguardando
          </span>
        )}
      </div>

      {/* Link */}
      <Button.Root variant="neutral" mode="stroke" size="xsmall" asChild>
        <Link href={href}>
          Ver detalhes
          <Button.Icon as={RiArrowRightLine} />
        </Link>
      </Button.Root>
    </div>
  );
}
