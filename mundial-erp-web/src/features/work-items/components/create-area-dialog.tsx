'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RiCheckLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as SwitchUI from '@/components/ui/switch';
import { useNotification } from '@/hooks/use-notification';
import { useCreateArea } from '@/features/settings/hooks/use-departments';
import { SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';

const AREA_COLORS = [
  '#7c3aed', '#8b5cf6', '#1e3a5f', '#3b82f6',
  '#06b6d4', '#22c55e', '#84cc16', '#eab308',
  '#f97316', '#ef4444', '#ec4899', '#a78bfa',
  '#92400e', '#1e293b', '#475569', '#94a3b8',
];

type CreateAreaDialogProps = {
  departmentId: string;
  departmentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAreaDialog({
  departmentId,
  departmentName,
  open,
  onOpenChange,
}: CreateAreaDialogProps) {
  const { notification } = useNotification();
  const queryClient = useQueryClient();
  const createArea = useCreateArea();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [useSpaceStatuses, setUseSpaceStatuses] = useState(true);

  function resetForm() {
    setName('');
    setDescription('');
    setColor(AREA_COLORS[0]);
    setIsPrivate(false);
    setUseSpaceStatuses(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleCreate() {
    if (!name.trim()) return;

    createArea.mutate(
      {
        name: name.trim(),
        departmentId,
        description: description.trim() || undefined,
        color,
        isPrivate,
        useSpaceStatuses,
      },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Area criada com sucesso.',
            status: 'success',
          });
          queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao criar area.',
            status: 'error',
          });
        },
      },
    );
  }

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header
          title="Criar Area"
          description={`Sera criada dentro de: ${departmentName}`}
        />
        <Modal.Body className="space-y-4">
          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">Cor</label>
            <div className="grid grid-cols-8 gap-2">
              {AREA_COLORS.map((c) => (
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

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Nome <span className="text-error-base">*</span>
            </label>
            <Input.Root size="medium">
              <Input.Wrapper>
                <Input.Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da area"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Descricao <span className="text-text-soft-400">(opcional)</span>
            </label>
            <Input.Root size="medium">
              <Input.Wrapper>
                <Input.Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descricao da area"
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Status config */}
          <div className="space-y-2 rounded-lg border border-stroke-soft-200 p-3">
            <label className="text-label-sm text-text-strong-950">
              Configuracao de Status
            </label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="statusConfig"
                  checked={useSpaceStatuses}
                  onChange={() => setUseSpaceStatuses(true)}
                  className="size-4 accent-primary-base"
                />
                <span className="text-paragraph-sm text-text-sub-600">
                  Herdar status do departamento
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="statusConfig"
                  checked={!useSpaceStatuses}
                  onChange={() => setUseSpaceStatuses(false)}
                  className="size-4 accent-primary-base"
                />
                <span className="text-paragraph-sm text-text-sub-600">
                  Personalizar status desta area
                </span>
              </label>
            </div>
          </div>

          {/* Private Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-stroke-soft-200 px-3 py-2.5">
            <div>
              <label
                htmlFor="area-private-toggle"
                className="cursor-pointer text-label-sm text-text-strong-950"
              >
                Tornar privado
              </label>
              <p className="text-paragraph-xs text-text-soft-400">
                Somente membros convidados terao acesso
              </p>
            </div>
            <SwitchUI.Root
              id="area-private-toggle"
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
            disabled={!name.trim() || createArea.isPending}
          >
            Criar
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
