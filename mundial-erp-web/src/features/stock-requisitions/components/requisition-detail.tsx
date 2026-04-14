'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/formatters';
import { RequisitionStatusBadge, RequisitionTypeBadge } from './requisition-status-badge';
import {
  useStockRequisition,
  useCancelRequisition,
} from '../hooks/use-stock-requisitions';
import { stockRequisitionService } from '../services/stock-requisition.service';
import { useNotification } from '@/hooks/use-notification';

type Props = {
  requisitionId: string;
};

export function RequisitionDetail({ requisitionId }: Props) {
  const { data: requisition, isLoading, error } = useStockRequisition(requisitionId);
  const cancelMutation = useCancelRequisition(requisitionId);
  const { notification } = useNotification();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-12 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-48 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-16'>
        <i className='ri-error-warning-line text-4xl text-state-error-base' />
        <p className='text-paragraph-md text-text-strong-950'>Requisicao nao encontrada</p>
        <Link href='/compras/requisicoes'>
          <Button.Root variant='neutral' mode='stroke' size='small'>
            Voltar para lista
          </Button.Root>
        </Link>
      </div>
    );
  }

  const processedCount = requisition.items.filter((i) => i.processed).length;
  const totalCount = requisition.items.length;

  async function handlePrintPdf() {
    setIsPrintingPdf(true);
    try {
      await stockRequisitionService.downloadPdf(requisitionId);
    } catch {
      notification({
        title: 'Erro ao gerar PDF',
        description: 'Nao foi possivel gerar o PDF da requisicao.',
        status: 'error',
      });
    } finally {
      setIsPrintingPdf(false);
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Link
            href='/compras/requisicoes'
            className='rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-50'
          >
            <i className='ri-arrow-left-line text-xl' />
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                {requisition.code}
              </h1>
              <RequisitionStatusBadge status={requisition.status} />
              <RequisitionTypeBadge type={requisition.type} />
            </div>
            <p className='text-paragraph-xs text-text-soft-400'>
              Solicitada em {formatDate(requisition.requestedAt)}
              {requisition.processedAt && ` · Processada em ${formatDate(requisition.processedAt)}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex items-center gap-2'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={handlePrintPdf}
            disabled={isPrintingPdf}
          >
            <Button.Icon as='i' className='ri-printer-line' />
            {isPrintingPdf ? 'Gerando...' : 'Imprimir PDF'}
          </Button.Root>

          {requisition.status === 'PENDING' && (
            <>
              <Link href='/compras/requisicoes/processar'>
                <Button.Root variant='primary' mode='filled' size='small'>
                  <Button.Icon as='i' className='ri-barcode-line' />
                  Processar via Scanner
                </Button.Root>
              </Link>
              <Button.Root
                variant='error'
                mode='stroke'
                size='small'
                onClick={() => setShowCancelModal(true)}
              >
                <Button.Icon as='i' className='ri-close-line' />
                Cancelar
              </Button.Root>
            </>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Solicitante</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {requisition.requestedByName ?? '-'}
            </p>
          </div>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Aprovado por</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {requisition.approvedByName ?? '-'}
            </p>
          </div>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Pedido vinculado</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {requisition.orderNumber ?? 'Nenhum'}
            </p>
          </div>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Processamento</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {processedCount}/{totalCount} itens
            </p>
          </div>
        </div>
        {requisition.notes && (
          <div className='mt-4 border-t border-stroke-soft-200 pt-4'>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Observacoes</span>
            <p className='mt-1 text-paragraph-sm text-text-sub-600'>
              {requisition.notes}
            </p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
        <div className='border-b border-stroke-soft-200 px-5 py-3'>
          <h2 className='text-label-md text-text-strong-950'>Itens da Requisicao</h2>
        </div>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Codigo</Table.Head>
              <Table.Head>Produto</Table.Head>
              <Table.Head className='text-center'>Unidade</Table.Head>
              <Table.Head className='text-right'>Qtd Solicitada</Table.Head>
              <Table.Head className='text-right'>Qtd Real</Table.Head>
              <Table.Head className='text-center'>Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {requisition.items.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell className='font-mono text-paragraph-xs text-text-sub-600'>
                  {item.productCode ?? '-'}
                </Table.Cell>
                <Table.Cell className='text-text-strong-950'>
                  {item.productName ?? '-'}
                </Table.Cell>
                <Table.Cell className='text-center text-text-sub-600'>
                  {item.unitType}
                </Table.Cell>
                <Table.Cell className='text-right text-text-sub-600'>
                  {item.requestedQuantity}
                </Table.Cell>
                <Table.Cell className='text-right text-text-sub-600'>
                  {item.actualQuantity ?? '-'}
                </Table.Cell>
                <Table.Cell className='text-center'>
                  {item.processed ? (
                    <span className='inline-flex items-center gap-1 text-paragraph-xs text-state-success-base'>
                      <i className='ri-check-line' /> Processado
                    </span>
                  ) : (
                    <span className='text-paragraph-xs text-text-soft-400'>Pendente</span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>

      {/* Cancel Modal */}
      <Modal.Root open={showCancelModal} onOpenChange={setShowCancelModal}>
        <Modal.Content>
          <Modal.Header
            title='Cancelar Requisicao'
            description='Tem certeza que deseja cancelar esta requisicao? Essa acao nao pode ser desfeita.'
          />
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setShowCancelModal(false)}
            >
              Voltar
            </Button.Root>
            <Button.Root
              variant='error'
              mode='filled'
              size='small'
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
