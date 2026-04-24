'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Radio from '@/components/ui/radio';
import * as Tooltip from '@/components/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkItemStatus } from '@/features/work-items/types/work-item.types';
import {
  useWorkflowStatuses,
  useCreateWorkflowStatus,
  useUpdateWorkflowStatus,
  useDeleteWorkflowStatus,
  useReorderWorkflowStatuses,
  WORKFLOW_STATUSES_KEY,
} from '../../hooks/use-workflow-statuses';
import { useUpdateArea } from '../../hooks/use-departments';
import { cn } from '@/lib/cn';
import { GroupSection } from './group-section';
import {
  DEFAULT_NEW_STATUS_COLOR,
  GROUPS,
  type StatusCategory,
} from './constants';
import type { StatusDraft } from './status-row';

type Mode = 'inherit' | 'custom';

export interface StatusEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'department' | 'area';
  targetId: string;
  targetName: string;
  parentName?: string;
  departmentId: string;
  initialMode: Mode;
  initialUseSpaceStatuses?: boolean;
}

function tempId(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function toDraft(status: WorkItemStatus, sortOrder: number): StatusDraft {
  return {
    id: status.id,
    name: status.name,
    color: status.color,
    category: status.category,
    sortOrder,
  };
}

export function StatusEditorDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  parentName,
  departmentId,
  initialMode,
  initialUseSpaceStatuses,
}: StatusEditorDialogProps) {
  const queryClient = useQueryClient();
  const { data: serverStatuses, isLoading } = useWorkflowStatuses(
    departmentId,
    targetType === 'area' ? targetId : undefined,
  );

  const createStatus = useCreateWorkflowStatus();
  const updateStatus = useUpdateWorkflowStatus();
  const deleteStatus = useDeleteWorkflowStatus();
  const reorderStatuses = useReorderWorkflowStatuses();
  const updateArea = useUpdateArea(targetType === 'area' ? targetId : '');

  const forcedCustom = targetType === 'department';
  const [mode, setMode] = useState<Mode>(forcedCustom ? 'custom' : initialMode);
  const [statuses, setStatuses] = useState<StatusDraft[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Resync local draft when server data arrives or dialog reopens
  useEffect(() => {
    if (!open) return;
    if (!serverStatuses) return;
    const drafts: StatusDraft[] = [];
    for (const group of GROUPS) {
      const groupItems = serverStatuses
        .filter((s) => s.category === group.key)
        .sort((a, b) => a.name.localeCompare(b.name));
      groupItems.forEach((s, idx) => drafts.push(toDraft(s, idx)));
    }
    setStatuses(drafts);
  }, [open, serverStatuses]);

  useEffect(() => {
    if (!open) return;
    setMode(forcedCustom ? 'custom' : initialMode);
  }, [open, initialMode, forcedCustom]);

  const serverById = useMemo(() => {
    const map = new Map<string, WorkItemStatus>();
    (serverStatuses ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [serverStatuses]);

  function statusesByGroup(group: StatusCategory): StatusDraft[] {
    return statuses
      .filter((s) => s.category === group)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function addStatus(group: StatusCategory) {
    const existingInGroup = statusesByGroup(group);
    const nextOrder = existingInGroup.length
      ? Math.max(...existingInGroup.map((s) => s.sortOrder)) + 1
      : 0;
    const newId = tempId();
    const newStatus: StatusDraft = {
      id: newId,
      name: '',
      color: DEFAULT_NEW_STATUS_COLOR,
      category: group,
      sortOrder: nextOrder,
    };
    setStatuses((prev) => [...prev, newStatus]);
    setJustAddedId(newId);
  }

  function updateStatusLocal(
    id: string,
    patch: Partial<Pick<StatusDraft, 'name' | 'color'>>,
  ) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function removeStatusLocal(id: string) {
    setStatuses((prev) => prev.filter((s) => s.id !== id));
  }

  function reorderGroup(
    group: StatusCategory,
    activeId: string,
    overId: string,
  ) {
    const groupItems = statusesByGroup(group);
    const oldIndex = groupItems.findIndex((s) => s.id === activeId);
    const newIndex = groupItems.findIndex((s) => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const moved = arrayMove(groupItems, oldIndex, newIndex);
    const reindexed = moved.map((s, idx) => ({ ...s, sortOrder: idx }));
    setStatuses((prev) => [
      ...prev.filter((s) => s.category !== group),
      ...reindexed,
    ]);
  }

  function validate(): string | null {
    for (const s of statuses) {
      if (!s.name.trim()) {
        return 'Todos os status precisam de um nome.';
      }
    }
    for (const group of GROUPS) {
      const items = statusesByGroup(group.key);
      if (group.key === 'CLOSED') {
        if (items.length !== 1) {
          return 'A categoria Closed deve ter exatamente 1 status.';
        }
      } else {
        if (items.length < 1) {
          return `A categoria ${group.label} precisa de ao menos 1 status.`;
        }
      }
    }
    return null;
  }

  async function handleApply() {
    if (mode === 'custom') {
      const err = validate();
      if (err) {
        toast.error(err);
        return;
      }
    }

    const localIds = new Set(statuses.map((s) => s.id));
    const deleted = (serverStatuses ?? []).filter((s) => !localIds.has(s.id));
    const created = statuses.filter((s) => s.id.startsWith('temp-'));
    const updated = statuses.filter((s) => {
      if (s.id.startsWith('temp-')) return false;
      const original = serverById.get(s.id);
      if (!original) return false;
      return (
        original.name !== s.name.trim() ||
        original.color !== s.color ||
        original.sortOrder !== s.sortOrder
      );
    });
    const areaModeChanged =
      targetType === 'area' &&
      mode !== initialMode &&
      (mode === 'inherit') !== (initialUseSpaceStatuses ?? true);

    const hasChanges =
      mode === 'custom' &&
      (deleted.length > 0 || created.length > 0 || updated.length > 0);

    if (!hasChanges && !areaModeChanged) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      if (mode === 'custom') {
        for (const d of deleted) {
          await deleteStatus.mutateAsync({ id: d.id });
        }

        const createdIdMap = new Map<string, string>();
        for (const c of created) {
          const result = await createStatus.mutateAsync({
            name: c.name.trim(),
            category: c.category,
            color: c.color,
            departmentId,
          });
          createdIdMap.set(c.id, result.id);
        }

        for (const u of updated) {
          const original = serverById.get(u.id);
          if (!original) continue;
          const patch: { name?: string; color?: string } = {};
          if (original.name !== u.name.trim()) patch.name = u.name.trim();
          if (original.color !== u.color) patch.color = u.color;
          if (Object.keys(patch).length > 0) {
            await updateStatus.mutateAsync({ id: u.id, ...patch });
          }
        }

        const reorderChanged = updated.some((u) => {
          const original = serverById.get(u.id);
          return original && original.sortOrder !== u.sortOrder;
        });
        if (reorderChanged || created.length > 0) {
          const reorderPayload = statuses.map((s) => ({
            id: createdIdMap.get(s.id) ?? s.id,
            sortOrder: s.sortOrder,
          }));
          await reorderStatuses.mutateAsync(reorderPayload);
        }
      }

      if (areaModeChanged) {
        await updateArea.mutateAsync({ useSpaceStatuses: mode === 'inherit' });
      }

      queryClient.invalidateQueries({
        queryKey: [
          ...WORKFLOW_STATUSES_KEY,
          departmentId,
          targetType === 'area' ? targetId : null,
        ],
      });
      toast.success('Status atualizados');
      onOpenChange(false);
    } catch (err) {
      console.error('[StatusEditorDialog] falha ao aplicar', err);
      const message =
        err instanceof Error ? err.message : 'Falha ao atualizar status.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className="max-w-[580px] rounded-lg !animate-none"
        overlayClassName="bg-black/50 backdrop-blur-0 !animate-none"
        role="dialog"
        aria-label="Editar status"
      >
        <Modal.Header className="pl-5 pr-14">
          <Modal.Title>
            Editar status de{' '}
            <span className="underline decoration-dashed decoration-text-soft-400 underline-offset-2">
              {targetName}
            </span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="flex gap-6">
            {/* Coluna esquerda — Tipo do status */}
            <div className="w-[45%] space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm text-text-strong-950">
                  Tipo do status
                </span>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Sobre os tipos de status"
                      className="flex size-3.5 items-center justify-center rounded-full text-text-soft-400 hover:text-text-sub-600"
                    >
                      ?
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    size="small"
                    variant="dark"
                    className="max-w-[260px]"
                  >
                    Por padrao, Listas e Pastas herdam os status do espaco.
                    Selecione Status personalizado para criar status
                    personalizados.
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>

              <Radio.Group
                value={mode}
                onValueChange={(value) => {
                  if (forcedCustom) return;
                  setMode(value as Mode);
                }}
                className="flex flex-col gap-2"
                disabled={forcedCustom}
              >
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke-soft-200 px-3 py-2',
                    mode === 'inherit' && 'ring-1 ring-primary-base',
                    forcedCustom && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Radio.Item value="inherit" className="mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[14px] text-text-strong-950">
                      {parentName
                        ? `Herdar de ${parentName}`
                        : 'Herdar da Pasta'}
                    </span>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke-soft-200 px-3 py-2',
                    mode === 'custom' && 'ring-1 ring-primary-base',
                  )}
                >
                  <Radio.Item value="custom" className="mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[14px] text-text-strong-950">
                      Personalizado
                    </span>
                  </div>
                </label>
              </Radio.Group>
            </div>

            {/* Coluna direita — editor */}
            <div
              className={cn(
                'flex-1 space-y-4',
                mode === 'inherit' && 'pointer-events-none opacity-50',
              )}
              aria-disabled={mode === 'inherit'}
            >
              <div className="flex items-center justify-end gap-2">
                {/* TODO(task-view): suporte a templates (criar/salvar).
                    Desabilitado nesta versao ate Tatiana cobrir a historia. */}
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1 rounded-lg border border-stroke-soft-200 px-2.5 py-1 text-[12px] text-text-sub-600 disabled:opacity-50"
                >
                  Templates
                  <ChevronDown className="size-3" />
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-stroke-soft-200 px-2.5 py-1 text-[12px] text-text-sub-600 disabled:opacity-50"
                >
                  Salvar template
                </button>
              </div>

              {isLoading ? (
                <p className="py-6 text-center text-sm text-text-soft-400">
                  Carregando status...
                </p>
              ) : (
                <ScrollArea.Root type="hover" className="h-[50vh] overflow-hidden">
                  <ScrollArea.Viewport className="size-full">
                    <div className="flex flex-col gap-4 pb-2 pr-3">
                      {GROUPS.map((group) => (
                        <GroupSection
                          key={group.key}
                          group={group}
                          items={statusesByGroup(group.key)}
                          onAdd={() => addStatus(group.key)}
                          onUpdate={updateStatusLocal}
                          onRemove={removeStatusLocal}
                          onReorder={(activeId, overId) =>
                            reorderGroup(group.key, activeId, overId)
                          }
                          justAddedId={justAddedId}
                          onColorPickerClosed={() => setJustAddedId(null)}
                        />
                      ))}
                    </div>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar
                    orientation="vertical"
                    className="flex w-1.5 touch-none select-none p-px transition-opacity duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
                  >
                    <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
              )}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="justify-end rounded-b-lg bg-[#FCFCFC] px-6 py-4">
          <div className="flex items-center gap-2">
            <Button.Root
              variant="neutral"
              mode="stroke"
              size="small"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant="primary"
              mode="filled"
              size="small"
              onClick={handleApply}
              disabled={saving || isLoading}
            >
              Aplicar
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
