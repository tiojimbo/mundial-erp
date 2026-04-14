'use client';

import { RiMailSendLine, RiFileList3Line } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import { formatCents } from '@/lib/formatters';
import type { PurchaseQuotation } from '../../types/quotation.types';

type Props = {
  quotation: PurchaseQuotation;
};

export function ProposalsTab({ quotation }: Props) {
  const hasProposal = ['RECEIVED', 'SELECTED', 'REJECTED'].includes(quotation.status);

  if (!hasProposal) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <RiMailSendLine className='size-8' />
        <p className='text-paragraph-sm'>Aguardando proposta do fornecedor</p>
        <p className='text-paragraph-xs'>
          A proposta será exibida aqui quando o fornecedor responder à cotação.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <div className='mb-4 flex items-center gap-2'>
          <RiFileList3Line className='size-5 text-primary-base' />
          <h3 className='text-label-md text-text-strong-950'>
            Proposta de {quotation.supplier?.name ?? 'Fornecedor'}
          </h3>
        </div>

        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Produto</Table.Head>
              <Table.Head>Código</Table.Head>
              <Table.Head className='text-right'>Qtd Solicitada</Table.Head>
              <Table.Head className='text-right'>Preço Unit. Proposto</Table.Head>
              <Table.Head className='text-right'>Total Item</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quotation.items.map((item) => {
              const totalCents = item.unitPriceCents * item.quantity;
              return (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <span className='font-medium text-text-strong-950'>
                      {item.product?.name ?? 'Produto'}
                    </span>
                  </Table.Cell>
                  <Table.Cell className='text-text-sub-600'>
                    {item.product?.code ?? '—'}
                  </Table.Cell>
                  <Table.Cell className='text-right'>{item.quantity}</Table.Cell>
                  <Table.Cell className='text-right'>
                    {formatCents(item.unitPriceCents)}
                  </Table.Cell>
                  <Table.Cell className='text-right font-medium'>
                    {formatCents(totalCents)}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>

        {/* Total */}
        <div className='mt-4 flex justify-end'>
          <div className='w-64 space-y-1 rounded-lg bg-bg-weak-50 p-4'>
            <div className='flex justify-between text-label-md'>
              <span className='text-text-strong-950'>Total Proposta</span>
              <span className='text-text-strong-950'>{formatCents(quotation.totalCents)}</span>
            </div>
          </div>
        </div>
      </div>

      {quotation.notes && (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <h3 className='mb-2 text-label-md text-text-strong-950'>Observações</h3>
          <p className='whitespace-pre-wrap text-paragraph-sm text-text-sub-600'>
            {quotation.notes}
          </p>
        </div>
      )}
    </div>
  );
}
