'use client';

import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiFilePdfLine,
  RiCodeSSlashLine,
  RiExternalLinkLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { formatCents, formatDate } from '@/lib/formatters';
import { useInvoice } from '../hooks/use-financial';
import { financialService } from '../services/financial.service';
import { INVOICE_DIRECTION_LABELS } from '../types/financial.types';
import type { InvoiceDirection } from '../types/financial.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const DIRECTION_COLOR: Record<InvoiceDirection, BadgeColor> = {
  INBOUND: 'blue',
  OUTBOUND: 'green',
};

type Props = {
  invoiceId: string;
};

export function InvoiceDetail({ invoiceId }: Props) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  async function handleDownloadPdf() {
    const url = await financialService.getInvoicePdfUrl(invoiceId);
    window.open(url, '_blank');
  }

  async function handleDownloadXml() {
    const xml = await financialService.getInvoiceXml(invoiceId);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfe-${invoice?.invoiceNumber ?? invoiceId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 text-text-soft-400'>
        <p className='text-paragraph-sm'>Nota fiscal não encontrada.</p>
        <Button.Root asChild variant='neutral' mode='ghost' size='small'>
          <Link href='/financeiro/notas-fiscais'>Voltar</Link>
        </Button.Root>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/financeiro/notas-fiscais'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>
              NF-e {invoice.invoiceNumber}
            </h1>
            <p className='text-paragraph-sm text-text-sub-600'>
              Nota Fiscal Eletrônica
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge.Root
            color={DIRECTION_COLOR[invoice.direction]}
            variant='lighter'
            size='small'
          >
            {INVOICE_DIRECTION_LABELS[invoice.direction]}
          </Badge.Root>
          {invoice.cancelledAt ? (
            <Badge.Root color='red' variant='lighter' size='small'>
              <Badge.Dot />
              Cancelada
            </Badge.Root>
          ) : (
            <Badge.Root color='green' variant='lighter' size='small'>
              <Badge.Dot />
              Ativa
            </Badge.Root>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className='flex gap-2'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='medium'
          onClick={handleDownloadPdf}
        >
          <Button.Icon as={RiFilePdfLine} />
          Baixar PDF
        </Button.Root>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='medium'
          onClick={handleDownloadXml}
        >
          <Button.Icon as={RiCodeSSlashLine} />
          Baixar XML
        </Button.Root>
        {invoice.pdfUrl && (
          <Button.Root
            variant='neutral'
            mode='ghost'
            size='medium'
            onClick={() => window.open(invoice.pdfUrl!, '_blank')}
          >
            <Button.Icon as={RiExternalLinkLine} />
            Abrir PDF
          </Button.Root>
        )}
      </div>

      {/* Summary */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Valor Total
          </span>
          <p className='text-title-h6 text-text-strong-950'>
            {formatCents(invoice.totalCents)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Data de Emissão
          </span>
          <p className='text-title-h6 text-text-strong-950'>
            {formatDate(invoice.issuedAt)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            {invoice.cancelledAt ? 'Cancelada em' : 'Empresa'}
          </span>
          <p className='text-title-h6 text-text-strong-950'>
            {invoice.cancelledAt
              ? formatDate(invoice.cancelledAt)
              : invoice.company?.tradeName ?? '—'}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className='rounded-lg border border-stroke-soft-200 p-6'>
        <h2 className='mb-4 text-label-md text-text-strong-950'>Detalhes</h2>
        <dl className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>Cliente</dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {invoice.client ? (
                <Link
                  href={`/comercial/clientes/${invoice.clientId}`}
                  className='text-primary-base hover:underline'
                >
                  {invoice.client.name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>Pedido</dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {invoice.order ? (
                <Link
                  href={`/comercial/pedidos/${invoice.orderId}`}
                  className='text-primary-base hover:underline'
                >
                  #{invoice.order.orderNumber}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className='md:col-span-2'>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Chave de Acesso
            </dt>
            <dd className='font-mono text-paragraph-sm text-text-strong-950'>
              {invoice.accessKey ?? '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
