'use client';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Invoice } from '../../types/order.types';

type Props = {
  invoices: Invoice[];
};

export function InvoicesTab({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-file-list-3-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhuma nota fiscal emitida</p>
      </div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Numero</Table.Head>
          <Table.Head>Direcao</Table.Head>
          <Table.Head className='text-right'>Valor</Table.Head>
          <Table.Head>Emissao</Table.Head>
          <Table.Head>Chave de Acesso</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head className='w-10' />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {invoices.map((inv) => {
          const isCancelled = !!inv.cancelledAt;
          return (
            <Table.Row key={inv.id}>
              <Table.Cell className='font-medium'>{inv.invoiceNumber}</Table.Cell>
              <Table.Cell>
                <Badge.Root
                  color={inv.direction === 'OUTBOUND' ? 'blue' : 'green'}
                  variant='lighter'
                  size='small'
                >
                  {inv.direction === 'OUTBOUND' ? 'Saida' : 'Entrada'}
                </Badge.Root>
              </Table.Cell>
              <Table.Cell className='text-right font-medium'>
                {formatCurrency(inv.totalCents)}
              </Table.Cell>
              <Table.Cell>{formatDate(inv.issuedAt)}</Table.Cell>
              <Table.Cell>
                <span className='max-w-[200px] truncate text-paragraph-xs text-text-sub-600'>
                  {inv.accessKey ?? '-'}
                </span>
              </Table.Cell>
              <Table.Cell>
                {isCancelled ? (
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
              </Table.Cell>
              <Table.Cell>
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary-base hover:opacity-70'
                  >
                    <i className='ri-file-pdf-line text-lg' />
                  </a>
                )}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
