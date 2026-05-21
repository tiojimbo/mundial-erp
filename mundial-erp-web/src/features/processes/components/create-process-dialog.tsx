'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as SwitchUI from '@/components/ui/switch';
import { useNotification } from '@/hooks/use-notification';
import { useCreateProcess } from '@/features/settings/hooks/use-processes';
import { SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';

type CreateProcessDialogProps = {
  folderId: string;
  parentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateProcessDialog({
  folderId,
  parentName,
  open,
  onOpenChange,
}: CreateProcessDialogProps) {
  const { notification } = useNotification();
  const queryClient = useQueryClient();
  const createProcess = useCreateProcess();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  function resetForm() {
    setName('');
    setDescription('');
    setIsPrivate(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleCreate() {
    if (!name.trim()) return;

    createProcess.mutate(
      {
        name: name.trim(),
        folderId,
        description: description.trim() || undefined,
        isPrivate,
      },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Processo criado com sucesso.',
            status: 'success',
          });
          queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao criar processo.',
            status: 'error',
          });
        },
      },
    );
  }

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header title="Criar Processo" />
        <Modal.Body className="space-y-4">
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
                  placeholder="Nome do processo"
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
                  placeholder="Descricao do processo"
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Contexto pai */}
          <div className="rounded-lg bg-bg-weak-50 px-3 py-2">
            <span className="text-paragraph-sm text-text-sub-600">
              Sera criado em: <strong>{parentName}</strong>
            </span>
          </div>

          {/* Private Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-stroke-soft-200 px-3 py-2.5">
            <div>
              <label
                htmlFor="process-private-toggle"
                className="cursor-pointer text-label-sm text-text-strong-950"
              >
                Tornar privado
              </label>
              <p className="text-paragraph-xs text-text-soft-400">
                Somente membros convidados terao acesso
              </p>
            </div>
            <SwitchUI.Root
              id="process-private-toggle"
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
            disabled={!name.trim() || createProcess.isPending}
          >
            Criar
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
