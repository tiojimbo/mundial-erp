'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import { useNotification } from '@/hooks/use-notification';
import { useCreateDepartment } from '@/features/settings/hooks/use-departments';
import { SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';

type CreateDepartmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateDepartmentDialog({
  open,
  onOpenChange,
}: CreateDepartmentDialogProps) {
  const { notification } = useNotification();
  const queryClient = useQueryClient();
  const createDepartment = useCreateDepartment();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const abbr = name.trim()
    ? name.trim().substring(0, 2).toUpperCase()
    : '?';

  function resetForm() {
    setName('');
    setDescription('');
    setIsPrivate(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createDepartment.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Departamento criado com sucesso.',
            status: 'success',
          });
          queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao criar departamento.',
            status: 'error',
          });
        },
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Overlay — acts as scroll container */}
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" />

        {/* Content */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border border-[oklch(0.922_0_0)] bg-white p-6 shadow-lg">
          {/* Header */}
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <Dialog.Title className="text-[18px] font-semibold leading-none">
              Criar espaço
            </Dialog.Title>
            <Dialog.Description className="text-[14px] font-normal text-[oklch(0.556_0_0)]">
              Um espaço representa equipes, departamentos ou grupos, cada um com
              suas próprias listas, fluxos de trabalho e configurações.
            </Dialog.Description>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field: Icon + Name */}
            <div className="grid gap-2 space-y-2">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#6b7280', border: '1px solid #e0e0e0' }}>
                    {abbr}
                  </span>
                </div>
                <div className="relative w-full">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Por exemplo, marketing, engenharia, RH"
                    autoFocus
                    className="flex h-9 w-full min-w-0 rounded-md border border-[oklch(0.922_0_0)] bg-transparent px-3 py-1 text-[14px] shadow-xs outline-none transition-[color,box-shadow] placeholder:text-[oklch(0.556_0_0)] focus-visible:border-[oklch(0.708_0.165_254.624)] focus-visible:ring-[3px] focus-visible:ring-[oklch(0.708_0.165_254.624)]/50"
                  />
                </div>
              </div>
              <label className="text-[12px] font-medium text-[oklch(0.556_0_0)]">
                Icone e nome
              </label>
            </div>

            {/* Field: Description */}
            <div className="grid gap-2 space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição"
                className="flex min-h-16 w-full rounded-md border border-[oklch(0.922_0_0)] bg-transparent px-3 py-2 text-[14px] shadow-xs outline-none transition-[color,box-shadow] placeholder:text-[oklch(0.556_0_0)] focus-visible:border-[oklch(0.708_0.165_254.624)] focus-visible:ring-[3px] focus-visible:ring-[oklch(0.708_0.165_254.624)]/50 disabled:cursor-not-allowed disabled:opacity-50 [field-sizing:content]"
              />
              <label className="text-[12px] font-medium text-[oklch(0.556_0_0)]">
                Descrição <span className="font-normal">(opcional)</span>
              </label>
            </div>

            {/* Field: Private toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <label
                  htmlFor="dept-private-toggle"
                  className="flex cursor-pointer select-none items-center gap-2 text-[14px] font-medium leading-none"
                >
                  Tornar privado
                </label>
                <p className="text-[12px] font-normal text-[oklch(0.556_0_0)]">
                  Somente você e membros convidados têm acesso
                </p>
              </div>
              <button
                id="dept-private-toggle"
                type="button"
                role="switch"
                aria-checked={isPrivate}
                data-state={isPrivate ? 'checked' : 'unchecked'}
                onClick={() => setIsPrivate(!isPrivate)}
                className="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.708_0.165_254.624)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[oklch(0.145_0_0)] data-[state=unchecked]:bg-[oklch(0.922_0_0)]"
              >
                <span
                  data-state={isPrivate ? 'checked' : 'unchecked'}
                  className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-[oklch(0.922_0_0)] bg-white px-4 py-2 text-[14px] font-medium shadow-xs outline-none transition-all hover:bg-[oklch(0.97_0_0)] focus-visible:ring-[3px] focus-visible:ring-[oklch(0.708_0.165_254.624)]/50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createDepartment.isPending}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-[14px] font-medium text-white shadow-xs outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: '#059669' }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#047857'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
              >
                Continuar
              </button>
            </div>
          </form>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[oklch(0.708_0.165_254.624)] focus:ring-offset-2 disabled:pointer-events-none"
            >
              <RiCloseLine className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
