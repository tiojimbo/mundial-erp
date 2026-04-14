'use client';

import { useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { useAuthStore } from '@/stores/auth.store';
import { useChangeOrderStatus } from '../hooks/use-orders';
import { getAvailableTransitions, type StatusTransition } from '../lib/order-status-machine';
import type { Order } from '../types/order.types';

type Props = {
  order: Order;
};

export function OrderContextualActions({ order }: Props) {
  const [confirmModal, setConfirmModal] = useState<StatusTransition | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [guardError, setGuardError] = useState<string | null>(null);
  const changeStatus = useChangeOrderStatus(order.id);
  const user = useAuthStore((state) => state.user);

  const available = getAvailableTransitions(
    order,
    user?.role,
    user?.department,
  );

  if (available.length === 0) return null;

  function handleAction(transition: StatusTransition) {
    if (transition.guard) {
      const error = transition.guard(order);
      if (error) {
        setGuardError(error);
        return;
      }
    }

    if (transition.requiresConfirmation) {
      setConfirmModal(transition);
      return;
    }

    changeStatus.mutate({ newStatus: transition.to });
  }

  function handleConfirm() {
    if (!confirmModal) return;
    const payload = confirmModal.to === 'CANCELADO' && cancelReason
      ? { reason: cancelReason }
      : undefined;

    changeStatus.mutate(
      { newStatus: confirmModal.to, payload },
      {
        onSuccess: () => {
          setConfirmModal(null);
          setCancelReason('');
        },
      },
    );
  }

  return (
    <>
      <div className='flex flex-wrap items-center gap-2'>
        {available.map((transition) => (
          <Button.Root
            key={transition.to}
            variant={transition.variant}
            mode={transition.variant === 'error' ? 'stroke' : 'filled'}
            size='small'
            onClick={() => handleAction(transition)}
            disabled={changeStatus.isPending}
          >
            <Button.Icon as='i' className={transition.icon} />
            {transition.label}
          </Button.Root>
        ))}
      </div>

      {guardError && (
        <div className='mt-2 flex items-center gap-2 rounded-lg border border-state-error-base bg-state-error-lighter px-3 py-2'>
          <i className='ri-error-warning-line text-state-error-base' />
          <span className='text-paragraph-sm text-state-error-base'>{guardError}</span>
          <button
            onClick={() => setGuardError(null)}
            className='ml-auto text-state-error-base hover:opacity-70'
          >
            <i className='ri-close-line' />
          </button>
        </div>
      )}

      {confirmModal && (
        <Modal.Root open onOpenChange={() => setConfirmModal(null)}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>Confirmar acao</Modal.Title>
              <Modal.Description>
                {confirmModal.to === 'CANCELADO'
                  ? 'Tem certeza que deseja cancelar este pedido? Esta acao nao pode ser desfeita.'
                  : `Deseja ${confirmModal.label.toLowerCase()}?`}
              </Modal.Description>
            </Modal.Header>
            <Modal.Body>
              {confirmModal.to === 'CANCELADO' && (
                <div className='space-y-1.5'>
                  <label className='text-label-sm text-text-strong-950'>
                    Motivo do cancelamento *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className='w-full rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm focus:border-primary-base focus:outline-none'
                    rows={3}
                    placeholder='Informe o motivo...'
                  />
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setConfirmModal(null)}
              >
                Voltar
              </Button.Root>
              <Button.Root
                variant={confirmModal.variant}
                mode='filled'
                size='small'
                onClick={handleConfirm}
                disabled={
                  changeStatus.isPending ||
                  (confirmModal.to === 'CANCELADO' && !cancelReason.trim())
                }
              >
                {changeStatus.isPending ? 'Processando...' : 'Confirmar'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </>
  );
}
