'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiSendPlaneLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiShoppingCart2Line,
  RiCloseCircleLine,
  RiMailCheckLine,
  RiErrorWarningLine,
  RiListCheck2,
  RiFileList3Line,
} from '@remixicon/react';
import * as TabMenu from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { formatCents, formatDate } from '@/lib/formatters';
import { QuotationStatusBadge } from './quotation-status-badge';
import { ItemsTab } from './dossier-tabs/items-tab';
import { ProposalsTab } from './dossier-tabs/proposals-tab';
import { TimelineTab } from './dossier-tabs/timeline-tab';
import {
  useQuotation,
  useUpdateQuotation,
  useSelectQuotation,
  useCreatePurchaseOrder,
} from '../hooks/use-quotations';
import type { PurchaseQuotationItem } from '../types/quotation.types';

type Props = {
  quotationId: string;
};

export function QuotationDossier({ quotationId }: Props) {
  const { data: quotation, isLoading, error } = useQuotation(quotationId);
  const updateMutation = useUpdateQuotation(quotationId);
  const selectMutation = useSelectQuotation(quotationId);
  const createOrderMutation = useCreatePurchaseOrder();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [proposalItems, setProposalItems] = useState<
    { productId: string; productName: string; quantity: number; unitPriceCents: string }[]
  >([]);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-12 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-48 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-16'>
        <RiErrorWarningLine className='size-10 text-state-error-base' />
        <p className='text-paragraph-md text-text-strong-950'>Cotação não encontrada</p>
        <Link href='/compras/cotacoes'>
          <Button.Root variant='neutral' mode='stroke' size='small'>
            Voltar para lista
          </Button.Root>
        </Link>
      </div>
    );
  }

  function handleSendQuotation() {
    updateMutation.mutate({ status: 'SENT' });
  }

  function handleRejectQuotation() {
    if (confirm('Tem certeza que deseja rejeitar esta cotação?')) {
      updateMutation.mutate({ status: 'REJECTED' });
    }
  }

  function handleOpenProposalModal() {
    if (!quotation) return;
    setProposalItems(
      quotation.items.map((item: PurchaseQuotationItem) => ({
        productId: item.productId,
        productName: item.product?.name ?? 'Produto',
        quantity: item.quantity,
        unitPriceCents: '',
      })),
    );
    setShowProposalModal(true);
  }

  function handleRegisterProposal() {
    const items = proposalItems.map((pi) => ({
      productId: pi.productId,
      quantity: pi.quantity,
      unitPriceCents: Math.round(parseFloat(pi.unitPriceCents.replace(',', '.')) * 100) || 0,
    }));
    updateMutation.mutate(
      {
        status: 'RECEIVED',
        receivedAt: new Date().toISOString(),
        items,
      },
      {
        onSuccess: () => {
          setShowProposalModal(false);
          setProposalItems([]);
        },
      },
    );
  }

  function handleSelectQuotation() {
    selectMutation.mutate();
  }

  function handleCreatePurchaseOrder() {
    createOrderMutation.mutate(
      {
        quotationId: quotation!.id,
        supplierId: quotation!.supplierId,
        totalCents: quotation!.totalCents,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: purchaseNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowPurchaseModal(false);
          setExpectedDeliveryDate('');
          setPurchaseNotes('');
        },
      },
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/compras/cotacoes'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                Cotação — {quotation.supplier?.name ?? 'Fornecedor'}
              </h1>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <p className='text-paragraph-xs text-text-soft-400'>
              Solicitada em {formatDate(quotation.requestedAt)}
              {quotation.receivedAt && ` · Recebida em ${formatDate(quotation.receivedAt)}`}
            </p>
            {quotation.totalCents > 0 && (
              <p className='text-paragraph-sm text-text-sub-600'>
                Total: {formatCents(quotation.totalCents)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons based on status */}
        <div className='flex items-center gap-2'>
          {quotation.status !== 'REJECTED' && quotation.status !== 'SELECTED' && (
            <Button.Root
              variant='error'
              mode='ghost'
              size='small'
              onClick={handleRejectQuotation}
              disabled={updateMutation.isPending}
            >
              <Button.Icon as={RiCloseCircleLine} />
              Rejeitar
            </Button.Root>
          )}

          {quotation.status === 'DRAFT' && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleSendQuotation}
              disabled={updateMutation.isPending}
            >
              <Button.Icon as={RiSendPlaneLine} />
              {updateMutation.isPending ? 'Enviando...' : 'Enviar Cotação'}
            </Button.Root>
          )}

          {quotation.status === 'SENT' && (
            <>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={handleOpenProposalModal}
              >
                <Button.Icon as={RiMailCheckLine} />
                Registrar Proposta
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='ghost'
                size='small'
                disabled
              >
                <Button.Icon as={RiTimeLine} />
                Aguardando resposta
              </Button.Root>
            </>
          )}

          {quotation.status === 'RECEIVED' && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleSelectQuotation}
              disabled={selectMutation.isPending}
            >
              <Button.Icon as={RiCheckDoubleLine} />
              {selectMutation.isPending ? 'Selecionando...' : 'Selecionar Cotação'}
            </Button.Root>
          )}

          {quotation.status === 'SELECTED' && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={() => setShowPurchaseModal(true)}
            >
              <Button.Icon as={RiShoppingCart2Line} />
              Efetivar Compra
            </Button.Root>
          )}
        </div>
      </div>

      {/* Supplier info card */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Fornecedor</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {quotation.supplier?.name ?? '-'}
            </p>
          </div>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>CPF/CNPJ</span>
            <p className='text-paragraph-sm text-text-strong-950'>
              {quotation.supplier?.cpfCnpj ?? '-'}
            </p>
          </div>
          <div>
            <span className='text-subheading-2xs uppercase text-text-soft-400'>Status</span>
            <div className='mt-1'>
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabMenu.Root defaultValue='itens'>
        <TabMenu.List>
          <TabMenu.Trigger value='itens'>
            <TabMenu.Icon as={RiListCheck2} />
            Itens
          </TabMenu.Trigger>
          <TabMenu.Trigger value='propostas'>
            <TabMenu.Icon as={RiFileList3Line} />
            Propostas
          </TabMenu.Trigger>
          <TabMenu.Trigger value='timeline'>
            <TabMenu.Icon as={RiTimeLine} />
            Timeline
          </TabMenu.Trigger>
        </TabMenu.List>

        <TabMenu.Content value='itens' className='pt-4'>
          <ItemsTab quotation={quotation} />
        </TabMenu.Content>

        <TabMenu.Content value='propostas' className='pt-4'>
          <ProposalsTab quotation={quotation} />
        </TabMenu.Content>

        <TabMenu.Content value='timeline' className='pt-4'>
          <TimelineTab quotationId={quotation.id} />
        </TabMenu.Content>
      </TabMenu.Root>

      {/* Efetivar Compra Modal */}
      <Modal.Root open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <Modal.Content>
          <Modal.Header
            title='Efetivar Compra'
            description='Ao confirmar, uma ordem de compra será criada e uma conta a pagar será gerada automaticamente.'
          />
          <Modal.Body>
            <div className='flex flex-col gap-4'>
              <div className='rounded-lg bg-bg-weak-50 p-3'>
                <div className='flex justify-between text-paragraph-sm'>
                  <span className='text-text-sub-600'>Fornecedor</span>
                  <span className='font-medium text-text-strong-950'>
                    {quotation.supplier?.name ?? '-'}
                  </span>
                </div>
                <div className='mt-1 flex justify-between text-paragraph-sm'>
                  <span className='text-text-sub-600'>Total</span>
                  <span className='font-medium text-text-strong-950'>
                    {formatCents(quotation.totalCents)}
                  </span>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label.Root htmlFor='expectedDeliveryDate'>Previsão de entrega</Label.Root>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      id='expectedDeliveryDate'
                      type='date'
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              <div className='space-y-1.5'>
                <Label.Root htmlFor='purchaseNotes'>Observações</Label.Root>
                <textarea
                  id='purchaseNotes'
                  rows={3}
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className='w-full rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm focus:border-primary-base focus:outline-none'
                  placeholder='Observações da ordem de compra...'
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setShowPurchaseModal(false)}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleCreatePurchaseOrder}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? 'Processando...' : 'Confirmar Compra'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Registrar Proposta Modal */}
      <Modal.Root open={showProposalModal} onOpenChange={setShowProposalModal}>
        <Modal.Content>
          <Modal.Header
            title='Registrar Proposta Recebida'
            description='Informe o preço unitário proposto pelo fornecedor para cada item.'
          />
          <Modal.Body>
            <div className='flex flex-col gap-3'>
              {proposalItems.map((pi, idx) => (
                <div
                  key={pi.productId}
                  className='flex items-center justify-between gap-3 rounded-lg border border-stroke-soft-200 p-3'
                >
                  <div className='flex-1'>
                    <p className='text-label-sm text-text-strong-950'>{pi.productName}</p>
                    <p className='text-paragraph-xs text-text-soft-400'>Qtd: {pi.quantity}</p>
                  </div>
                  <div className='w-36'>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.InlineAffix>R$</Input.InlineAffix>
                        <Input.Input
                          placeholder='0,00'
                          value={pi.unitPriceCents}
                          onChange={(e) => {
                            const updated = [...proposalItems];
                            updated[idx] = { ...updated[idx], unitPriceCents: e.target.value };
                            setProposalItems(updated);
                          }}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setShowProposalModal(false)}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleRegisterProposal}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Salvando...' : 'Registrar Proposta'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
