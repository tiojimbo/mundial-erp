'use client';

import { useState } from 'react';
import {
  RiLockLine,
  RiLockUnlockLine,
  RiSafeLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import { formatCents, formatDateTime } from '@/lib/formatters';
import {
  useCashRegisters,
  useOpenCashRegister,
  useCloseCashRegister,
} from '../hooks/use-financial';
import type { CashRegister as CashRegisterType } from '../types/financial.types';

export function CashRegisterPage() {
  const { data, isLoading } = useCashRegisters({ sortBy: 'openedAt', sortOrder: 'desc' });
  const [openDialog, setOpenDialog] = useState(false);
  const [closeTarget, setCloseTarget] = useState<CashRegisterType | null>(null);

  const items = data?.data ?? [];
  const currentOpen = items.find((cr) => !cr.closedAt);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Caixa</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Abra e feche o caixa diário.
          </p>
        </div>
        <div className='flex gap-2'>
          {currentOpen ? (
            <Button.Root
              variant='error'
              mode='filled'
              size='medium'
              onClick={() => setCloseTarget(currentOpen)}
            >
              <Button.Icon as={RiLockLine} />
              Fechar Caixa
            </Button.Root>
          ) : (
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              onClick={() => setOpenDialog(true)}
            >
              <Button.Icon as={RiLockUnlockLine} />
              Abrir Caixa
            </Button.Root>
          )}
        </div>
      </div>

      {/* Current status */}
      {currentOpen && (
        <div className='rounded-lg border border-state-success-base/30 bg-state-success-base/5 p-4'>
          <div className='flex items-center gap-2'>
            <RiSafeLine className='size-5 text-state-success-base' />
            <span className='text-label-sm text-state-success-base'>
              Caixa aberto
            </span>
          </div>
          <div className='mt-2 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div>
              <span className='text-paragraph-xs text-text-soft-400'>
                Aberto por
              </span>
              <p className='text-paragraph-sm text-text-strong-950'>
                {currentOpen.openedByUser?.name ?? '—'}
              </p>
            </div>
            <div>
              <span className='text-paragraph-xs text-text-soft-400'>
                Aberto em
              </span>
              <p className='text-paragraph-sm text-text-strong-950'>
                {formatDateTime(currentOpen.openedAt)}
              </p>
            </div>
            <div>
              <span className='text-paragraph-xs text-text-soft-400'>
                Saldo Inicial
              </span>
              <p className='text-paragraph-sm font-medium text-text-strong-950'>
                {formatCents(currentOpen.openingBalanceCents)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Abertura</Table.Head>
            <Table.Head>Fechamento</Table.Head>
            <Table.Head>Aberto por</Table.Head>
            <Table.Head>Fechado por</Table.Head>
            <Table.Head className='text-right'>Saldo Inicial</Table.Head>
            <Table.Head className='text-right'>Saldo Final</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Table.Row key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <Table.Cell key={j}>
                    <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          ) : items.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={7} className='text-center'>
                <p className='py-8 text-paragraph-sm text-text-soft-400'>
                  Nenhum registro de caixa encontrado.
                </p>
              </Table.Cell>
            </Table.Row>
          ) : (
            items.map((cr) => (
              <Table.Row key={cr.id}>
                <Table.Cell>
                  <span className='text-paragraph-sm text-text-sub-600'>
                    {formatDateTime(cr.openedAt)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className='text-paragraph-sm text-text-sub-600'>
                    {cr.closedAt ? formatDateTime(cr.closedAt) : '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className='text-paragraph-sm text-text-sub-600'>
                    {cr.openedByUser?.name ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className='text-paragraph-sm text-text-sub-600'>
                    {cr.closedByUser?.name ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {formatCents(cr.openingBalanceCents)}
                </Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {cr.closingBalanceCents != null
                    ? formatCents(cr.closingBalanceCents)
                    : '—'}
                </Table.Cell>
                <Table.Cell>
                  {cr.closedAt ? (
                    <Badge.Root color='gray' variant='lighter' size='small'>
                      <Badge.Dot />
                      Fechado
                    </Badge.Root>
                  ) : (
                    <Badge.Root color='green' variant='lighter' size='small'>
                      <Badge.Dot />
                      Aberto
                    </Badge.Root>
                  )}
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>

      {/* Open Dialog */}
      {openDialog && (
        <OpenCashDialog onClose={() => setOpenDialog(false)} />
      )}

      {/* Close Dialog */}
      {closeTarget && (
        <CloseCashDialog
          cashRegister={closeTarget}
          onClose={() => setCloseTarget(null)}
        />
      )}
    </div>
  );
}

// ===== Open Cash Dialog =====

function OpenCashDialog({ onClose }: { onClose: () => void }) {
  const [companyId, setCompanyId] = useState('');
  const [balanceReais, setBalanceReais] = useState('');
  const mutation = useOpenCashRegister();

  const balanceCents = Math.round(parseFloat(balanceReais || '0') * 100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;

    mutation.mutate(
      { companyId, openingBalanceCents: balanceCents },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Abrir Caixa</Modal.Title>
          <Modal.Description>
            Informe o saldo inicial para abertura do caixa.
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='mb-1 block text-label-sm text-text-strong-950'>
              Empresa
            </label>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='ID da empresa'
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div>
            <label className='mb-1 block text-label-sm text-text-strong-950'>
              Saldo Inicial (R$)
            </label>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder='0,00'
                  value={balanceReais}
                  onChange={(e) => setBalanceReais(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='medium'
              type='button'
              onClick={onClose}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              type='submit'
              disabled={!companyId || mutation.isPending}
            >
              {mutation.isPending ? 'Abrindo...' : 'Abrir Caixa'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}

// ===== Close Cash Dialog =====

function CloseCashDialog({
  cashRegister,
  onClose,
}: {
  cashRegister: CashRegisterType;
  onClose: () => void;
}) {
  const [balanceReais, setBalanceReais] = useState('');
  const mutation = useCloseCashRegister(cashRegister.id);

  const balanceCents = Math.round(parseFloat(balanceReais || '0') * 100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { closingBalanceCents: balanceCents },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Fechar Caixa</Modal.Title>
          <Modal.Description>
            Saldo inicial: {formatCents(cashRegister.openingBalanceCents)}
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='mb-1 block text-label-sm text-text-strong-950'>
              Saldo Final (R$)
            </label>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder='0,00'
                  value={balanceReais}
                  onChange={(e) => setBalanceReais(e.target.value)}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='medium'
              type='button'
              onClick={onClose}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='error'
              mode='filled'
              size='medium'
              type='submit'
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Fechando...' : 'Fechar Caixa'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
