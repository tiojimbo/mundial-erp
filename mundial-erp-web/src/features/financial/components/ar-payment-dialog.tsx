'use client';

import { useState } from 'react';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import { formatCents } from '@/lib/formatters';
import { useRegisterARPayment } from '../hooks/use-financial';

type Props = {
  arId: string;
  balanceCents: number;
  onClose: () => void;
};

export function ARPaymentDialog({ arId, balanceCents, onClose }: Props) {
  const [amountReais, setAmountReais] = useState('');
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const mutation = useRegisterARPayment(arId);

  const amountCents = Math.round(parseFloat(amountReais || '0') * 100);
  const isValid = amountCents > 0 && amountCents <= balanceCents;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    mutation.mutate(
      { paidAmountCents: amountCents, paidDate },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Registrar Pagamento</Modal.Title>
          <Modal.Description>
            Saldo pendente: {formatCents(balanceCents)}
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='mb-1 block text-label-sm text-text-strong-950'>
              Valor (R$)
            </label>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  type='number'
                  step='0.01'
                  min='0.01'
                  max={(balanceCents / 100).toFixed(2)}
                  placeholder='0,00'
                  value={amountReais}
                  onChange={(e) => setAmountReais(e.target.value)}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div>
            <label className='mb-1 block text-label-sm text-text-strong-950'>
              Data do Pagamento
            </label>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  type='date'
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
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
              disabled={!isValid || mutation.isPending}
            >
              {mutation.isPending ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
