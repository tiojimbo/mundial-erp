'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as SwitchUI from '@/components/ui/switch';
import { RiCheckLine } from '@remixicon/react';
import { useNotification } from '@/hooks/use-notification';
import { useCreateDepartment } from '@/features/settings/hooks/use-departments';
import { SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';
const DEPT_COLORS = [
  '#7c3aed', '#8b5cf6', '#1e3a5f', '#3b82f6',
  '#06b6d4', '#22c55e', '#84cc16', '#eab308',
  '#f97316', '#ef4444', '#ec4899', '#a78bfa',
  '#92400e', '#1e293b', '#475569', '#94a3b8',
];

type CreateDepartmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateDepartmentDialog({ open, onOpenChange }: CreateDepartmentDialogProps) {
  const { notification } = useNotification();
  const queryClient = useQueryClient();
  const createDepartment = useCreateDepartment();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEPT_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);

  function resetForm() {
    setName('');
    setDescription('');
    setColor(DEPT_COLORS[0]);
    setIsPrivate(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleCreate() {
    if (!name.trim()) return;

    createDepartment.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
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
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header title="Criar Departamento" />
        <Modal.Body className="space-y-4">
          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">Cor</label>
            <div className="grid grid-cols-7 gap-2">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="flex size-7 items-center justify-center rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-base focus:ring-offset-2"
                  style={{ backgroundColor: c }}
                  type="button"
                >
                  {c === color && (
                    <RiCheckLine className="size-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Nome <span className="text-error-base">*</span>
            </label>
            <Input.Root size="medium">
              <Input.Wrapper>
                <Input.Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do departamento"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Descri\u00e7\u00e3o <span className="text-text-soft-400">(opcional)</span>
            </label>
            <Input.Root size="medium">
              <Input.Wrapper>
                <Input.Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descri\u00e7\u00e3o do departamento"
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Private Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-stroke-soft-200 px-3 py-2.5">
            <label
              htmlFor="dept-private-toggle"
              className="text-label-sm text-text-strong-950 cursor-pointer"
            >
              Tornar privado
            </label>
            <SwitchUI.Root
              id="dept-private-toggle"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            variant="neutral"
            mode="stroke"
            size="small"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button.Root>
          <Button.Root
            variant="primary"
            mode="filled"
            size="small"
            onClick={handleCreate}
            disabled={!name.trim() || createDepartment.isPending}
          >
            Criar Espa\u00e7o
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
