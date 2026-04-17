'use client';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { RiAlertLine, RiDeleteBinLine } from '@remixicon/react';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  isLoading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = 'default',
  onConfirm,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content showClose={false}>
        <Modal.Header
          icon={variant === 'destructive' ? RiDeleteBinLine : RiAlertLine}
          title={title}
          description={description}
        />
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button.Root>
          <Button.Root
            variant={variant === 'destructive' ? 'error' : 'primary'}
            mode='filled'
            size='small'
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
