'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  RiListCheck2,
  RiFlowChart,
  RiInformationLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as SwitchUI from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { useNotification } from '@/hooks/use-notification';
import { useCreateProcess } from '@/features/settings/hooks/use-processes';
import { SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';

type CreateProcessDialogProps = {
  areaId?: string;
  departmentId?: string;
  parentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateProcessDialog({
  areaId,
  departmentId,
  parentName,
  open,
  onOpenChange,
}: CreateProcessDialogProps) {
  const { notification } = useNotification();
  const queryClient = useQueryClient();
  const createProcess = useCreateProcess();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [processType, setProcessType] = useState<'LIST' | 'BPM'>('LIST');
  const [isPrivate, setIsPrivate] = useState(false);

  function resetForm() {
    setName('');
    setDescription('');
    setProcessType('LIST');
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
        areaId: areaId || undefined,
        departmentId: departmentId || undefined,
        description: description.trim() || undefined,
        processType,
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

          {/* Tipo do processo */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-label-sm text-text-strong-950">
                Tipo
              </label>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <RiInformationLine className="size-3.5 text-text-soft-400" />
                </Tooltip.Trigger>
                <Tooltip.Content className="max-w-[260px]">
                  <strong>Lista:</strong> Tarefas com status, responsavel e prazos.
                  <br />
                  <strong>BPM:</strong> Processo dirigido por maquina de estados (pedidos, producao).
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProcessType('LIST')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  processType === 'LIST'
                    ? 'border-primary-base bg-primary-base/5 text-primary-base'
                    : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
                )}
              >
                <RiListCheck2 className="size-5 shrink-0" />
                <div>
                  <span className="text-label-sm">Lista</span>
                  <p className="text-paragraph-xs text-text-soft-400">
                    Tarefas e itens
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProcessType('BPM')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  processType === 'BPM'
                    ? 'border-primary-base bg-primary-base/5 text-primary-base'
                    : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
                )}
              >
                <RiFlowChart className="size-5 shrink-0" />
                <div>
                  <span className="text-label-sm">BPM</span>
                  <p className="text-paragraph-xs text-text-soft-400">
                    Fluxo de estados
                  </p>
                </div>
              </button>
            </div>
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
