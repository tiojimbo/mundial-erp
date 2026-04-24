'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/lib/cn';

/**
 * Sprint 5 (TSK-150) — ConfirmDialog.
 * tasks.md §7 popovers + padrao shadcn AlertDialog.
 *
 * Implementado sobre `@radix-ui/react-dialog` (AlertDialog nao esta instalado).
 * Se `destructive=true`, habilita botao somente apos input "CONFIRMAR".
 * A11y: role="alertdialog" via forceMount + aria-modal do Radix.
 */

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const canConfirm = destructive ? typed === 'CONFIRMAR' : true;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] bg-card p-6 shadow-lg outline-none"
        >
          <Dialog.Title className="text-base font-semibold text-foreground">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          )}
          {destructive && (
            <div className="mt-4">
              <label
                htmlFor="confirm-typed"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Digite CONFIRMAR para habilitar:
              </label>
              <input
                id="confirm-typed"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-ring"
              />
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-[10px] border border-border bg-transparent px-3 text-sm font-medium transition-colors duration-150 hover:bg-muted"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
              className={cn(
                'h-9 rounded-[10px] px-3 text-sm font-medium shadow-sm transition-opacity duration-150 hover:opacity-90 disabled:opacity-50',
                destructive
                  ? 'bg-red-600 text-white'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
