'use client';

import { useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Dropdown from '@/components/ui/dropdown';
import {
  useStartProduction,
  useCompleteProduction,
  useCancelProduction,
} from '../hooks/use-production';
import { productionService } from '../services/production.service';
import type { ProductionOrder } from '../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function POActions({ order }: Props) {
  const [confirmAction, setConfirmAction] = useState<'start' | 'complete' | 'cancel' | null>(null);

  const startMutation = useStartProduction(order.id);
  const completeMutation = useCompleteProduction(order.id);
  const cancelMutation = useCancelProduction(order.id);

  const isLoading =
    startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

  function handleConfirm() {
    if (confirmAction === 'start') {
      startMutation.mutate(undefined, { onSuccess: () => setConfirmAction(null) });
    } else if (confirmAction === 'complete') {
      completeMutation.mutate(undefined, { onSuccess: () => setConfirmAction(null) });
    } else if (confirmAction === 'cancel') {
      cancelMutation.mutate(undefined, { onSuccess: () => setConfirmAction(null) });
    }
  }

  const confirmMessages = {
    start: {
      title: 'Iniciar Producao',
      description: 'Deseja iniciar a producao desta ordem? O status sera alterado para "Em Producao".',
      variant: 'primary' as const,
    },
    complete: {
      title: 'Concluir Producao',
      description:
        'Deseja marcar esta ordem como concluida? O estoque sera atualizado automaticamente.',
      variant: 'primary' as const,
    },
    cancel: {
      title: 'Cancelar Producao',
      description: 'Tem certeza que deseja cancelar esta ordem de producao? Esta acao nao pode ser desfeita.',
      variant: 'error' as const,
    },
  };

  return (
    <>
      <div className='flex items-center gap-2'>
        {/* Primary actions based on status */}
        {order.status === 'PENDING' && (
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            onClick={() => setConfirmAction('start')}
            disabled={isLoading}
          >
            <Button.Icon as='i' className='ri-play-line' />
            Iniciar Producao
          </Button.Root>
        )}

        {order.status === 'IN_PROGRESS' && (
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            onClick={() => setConfirmAction('complete')}
            disabled={isLoading}
          >
            <Button.Icon as='i' className='ri-checkbox-circle-line' />
            Concluir Producao
          </Button.Root>
        )}

        {/* PDF */}
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={() => {
            const url = productionService.getProductionOrderPdfUrl(order.id);
            window.open(url, '_blank');
          }}
        >
          <Button.Icon as='i' className='ri-file-text-line' />
          Ficha OP
        </Button.Root>

        {/* More actions dropdown */}
        {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button className='rounded-lg border border-stroke-soft-200 p-2 text-text-sub-600 hover:bg-bg-weak-50'>
                <i className='ri-more-2-fill text-lg' />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align='end' sideOffset={4}>
              <Dropdown.Item
                onSelect={() => setConfirmAction('cancel')}
                className='text-state-error-base'
              >
                <Dropdown.ItemIcon as='i' className='ri-close-circle-line' />
                Cancelar OP
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <Modal.Root open onOpenChange={() => setConfirmAction(null)}>
          <Modal.Content>
            <Modal.Header
              title={confirmMessages[confirmAction].title}
              description={confirmMessages[confirmAction].description}
            />
            <Modal.Footer>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setConfirmAction(null)}
                disabled={isLoading}
              >
                Cancelar
              </Button.Root>
              <Button.Root
                variant={confirmMessages[confirmAction].variant === 'error' ? 'error' : 'primary'}
                mode='filled'
                size='small'
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : 'Confirmar'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </>
  );
}
