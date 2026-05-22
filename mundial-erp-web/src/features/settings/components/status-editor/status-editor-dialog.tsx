'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Trash2 } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Radio from '@/components/ui/radio';
import * as Tooltip from '@/components/ui/tooltip';
import * as Dropdown from '@/components/ui/dropdown';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  STATUSES_KEY,
} from '../../hooks/use-statuses';
import {
  useStatusTemplates,
  useCreateStatusTemplate,
  useDeleteStatusTemplate,
} from '../../hooks/use-status-templates';
import {
  useDepartment,
  useArea,
  useUpdateAreaStatusInherit,
  DEPARTMENTS_KEY,
  AREAS_KEY,
} from '../../hooks/use-departments';
import {
  useProcess,
  useUpdateProcessStatusInherit,
  PROCESSES_KEY,
} from '../../hooks/use-processes';
import type { StatusBulkItem } from '../../services/processes.service';
import type { StatusInlineConfig } from '../../types/settings.types';
import { cn } from '@/lib/cn';
import { GroupSection } from './group-section';
import { DEFAULT_NEW_STATUS_COLOR, GROUPS, type StatusType } from './constants';
import type { StatusDraft } from './status-row';

type Mode = 'inherit' | 'custom';

export interface StatusEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'department' | 'area' | 'list';
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

function toDraft(status: StatusInlineConfig, position: number): StatusDraft {
  return {
    id: status.id,
    name: status.name,
    color: status.color,
    type: status.type,
    position,
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
}: StatusEditorDialogProps) {
  const queryClient = useQueryClient();

  const departmentQuery = useDepartment(
    targetType === 'department' ? departmentId : '',
  );
  const areaQuery = useArea(targetType === 'area' ? targetId : '');
  const processQuery = useProcess(targetType === 'list' ? targetId : '');

  const isLoading =
    targetType === 'department'
      ? departmentQuery.isLoading
      : targetType === 'area'
        ? areaQuery.isLoading
        : processQuery.isLoading;

  const serverStatuses: StatusInlineConfig[] = useMemo(() => {
    if (targetType === 'department') {
      return departmentQuery.data?.statuses ?? [];
    }
    if (targetType === 'area') {
      return areaQuery.data?.statuses ?? [];
    }
    return (processQuery.data?.statuses ?? []) as StatusInlineConfig[];
  }, [targetType, departmentQuery.data, areaQuery.data, processQuery.data]);

  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();
  const updateAreaStatusInherit = useUpdateAreaStatusInherit(
    targetType === 'area' ? targetId : '',
  );
  const updateProcessInherit = useUpdateProcessStatusInherit(
    targetType === 'list' ? targetId : '',
  );
  const templatesQuery = useStatusTemplates();
  const createTemplate = useCreateStatusTemplate();
  const deleteTemplate = useDeleteStatusTemplate();

  const forcedCustom = targetType === 'department';
  const [mode, setMode] = useState<Mode>(forcedCustom ? 'custom' : initialMode);
  const [statuses, setStatuses] = useState<StatusDraft[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (!serverStatuses) return;
    const drafts: StatusDraft[] = [];
    for (const group of GROUPS) {
      const groupItems = serverStatuses
        .filter((s) => s.type === group.key)
        .sort((a, b) => a.position - b.position);
      groupItems.forEach((s, idx) => drafts.push(toDraft(s, idx)));
    }
    setStatuses(drafts);
  }, [open, serverStatuses]);

  useEffect(() => {
    if (!open) return;
    setMode(forcedCustom ? 'custom' : initialMode);
  }, [open, initialMode, forcedCustom]);

  const serverById = useMemo(() => {
    const map = new Map<string, StatusInlineConfig>();
    serverStatuses.forEach((s) => map.set(s.id, s));
    return map;
  }, [serverStatuses]);

  function statusesByGroup(group: StatusType): StatusDraft[] {
    return statuses
      .filter((s) => s.type === group)
      .sort((a, b) => a.position - b.position);
  }

  function addStatus(group: StatusType) {
    const existingInGroup = statusesByGroup(group);
    const nextOrder = existingInGroup.length
      ? Math.max(...existingInGroup.map((s) => s.position)) + 1
      : 0;
    const newId = tempId();
    const newStatus: StatusDraft = {
      id: newId,
      name: '',
      color: DEFAULT_NEW_STATUS_COLOR,
      type: group,
      position: nextOrder,
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

  function applyTemplate(templateId: string) {
    const template = (templatesQuery.data ?? []).find(
      (t) => t.id === templateId,
    );
    if (!template) return;
    const drafts: StatusDraft[] = template.statuses.map((item) => ({
      id: tempId(),
      name: item.name,
      color: item.color,
      type: item.type,
      position: item.position,
    }));
    setStatuses(drafts);
    toast.success(`Template "${template.name}" aplicado`);
  }

  async function handleSaveAsTemplate() {
    if (statuses.length === 0) {
      toast.error('Adicione status antes de salvar como template.');
      return;
    }
    const name = window.prompt('Nome do template:');
    if (!name || !name.trim()) return;
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        statuses: statuses.map((s) => ({
          name: s.name.trim(),
          type: s.type,
          color: s.color,
          position: s.position,
        })),
      });
      toast.success('Template salvo');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha ao salvar template.';
      toast.error(message);
    }
  }

  async function handleDeleteTemplate(
    templateId: string,
    templateName: string,
  ) {
    if (!window.confirm(`Remover template "${templateName}"?`)) return;
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success('Template removido');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha ao remover template.';
      toast.error(message);
    }
  }

  function reorderGroup(group: StatusType, activeId: string, overId: string) {
    const groupItems = statusesByGroup(group);
    const oldIndex = groupItems.findIndex((s) => s.id === activeId);
    const newIndex = groupItems.findIndex((s) => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const moved = arrayMove(groupItems, oldIndex, newIndex);
    const reindexed = moved.map((s, idx) => ({ ...s, position: idx }));
    setStatuses((prev) => [
      ...prev.filter((s) => s.type !== group),
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

    if (targetType === 'list' || targetType === 'area') {
      await applyBulk();
      return;
    }

    await applyDepartment();
  }

  // List e folder: troca de herança + statuses num único PUT bulk. O backend
  // copia os statuses herdados pro escopo próprio e remapeia as tasks.
  async function applyBulk() {
    const bulkStatuses: StatusBulkItem[] =
      mode === 'custom'
        ? statuses.map((s) => ({
            ...(s.id.startsWith('temp-') ? {} : { id: s.id }),
            type: s.type,
            name: s.name.trim(),
            color: s.color,
            position: s.position,
          }))
        : [];

    setSaving(true);
    try {
      const payload = {
        statusInheritance: (mode === 'inherit' ? 'SPACE' : 'CUSTOM') as
          | 'SPACE'
          | 'CUSTOM',
        statuses: bulkStatuses,
      };
      if (targetType === 'list') {
        await updateProcessInherit.mutateAsync(payload);
      } else {
        await updateAreaStatusInherit.mutateAsync(payload);
      }

      queryClient.invalidateQueries({ queryKey: STATUSES_KEY });
      queryClient.invalidateQueries({
        queryKey:
          targetType === 'list'
            ? [...PROCESSES_KEY, targetId]
            : [...AREAS_KEY, targetId],
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

  // Department: statuses são sempre próprios do espaço, sem herança.
  async function applyDepartment() {
    const localIds = new Set(statuses.map((s) => s.id));
    const deleted = serverStatuses.filter((s) => !localIds.has(s.id));
    const created = statuses.filter((s) => s.id.startsWith('temp-'));
    const updated = statuses.filter((s) => {
      if (s.id.startsWith('temp-')) return false;
      const original = serverById.get(s.id);
      if (!original) return false;
      return (
        original.name !== s.name.trim() ||
        original.color !== s.color ||
        original.position !== s.position
      );
    });

    if (deleted.length === 0 && created.length === 0 && updated.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      for (const d of deleted) {
        await deleteStatus.mutateAsync(d.id);
      }

      for (const c of created) {
        await createStatus.mutateAsync({
          type: c.type,
          name: c.name.trim(),
          color: c.color,
          position: c.position,
          spaceId: departmentId,
        });
      }

      for (const u of updated) {
        const original = serverById.get(u.id);
        if (!original) continue;
        const patch: {
          name?: string;
          color?: string;
          position?: number;
        } = {};
        if (original.name !== u.name.trim()) patch.name = u.name.trim();
        if (original.color !== u.color) patch.color = u.color;
        if (original.position !== u.position) patch.position = u.position;
        if (Object.keys(patch).length > 0) {
          await updateStatus.mutateAsync({ id: u.id, payload: patch });
        }
      }

      queryClient.invalidateQueries({ queryKey: STATUSES_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPARTMENTS_KEY, departmentId],
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
        className='max-w-[580px] !animate-none rounded-lg'
        overlayClassName='bg-black/50 backdrop-blur-0 !animate-none'
        role='dialog'
        aria-label='Editar status'
      >
        <Modal.Header className='pl-5 pr-14'>
          <Modal.Title>
            Editar status de{' '}
            <span className='underline decoration-text-soft-400 decoration-dashed underline-offset-2'>
              {targetName}
            </span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className='flex gap-6'>
            <div className='w-[45%] space-y-3'>
              <div className='flex items-center gap-1.5'>
                <span className='text-label-sm text-text-strong-950'>
                  Tipo do status
                </span>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      aria-label='Sobre os tipos de status'
                      className='flex size-3.5 items-center justify-center rounded-full text-text-soft-400 hover:text-text-sub-600'
                    >
                      ?
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    size='small'
                    variant='dark'
                    className='max-w-[260px]'
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
                className='flex flex-col gap-2'
                disabled={forcedCustom}
              >
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke-soft-200 px-3 py-2',
                    mode === 'inherit' && 'ring-1 ring-primary-base',
                    forcedCustom && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Radio.Item value='inherit' className='mt-0.5' />
                  <div className='flex flex-col'>
                    <span className='text-[14px] text-text-strong-950'>
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
                  <Radio.Item value='custom' className='mt-0.5' />
                  <div className='flex flex-col'>
                    <span className='text-[14px] text-text-strong-950'>
                      Personalizado
                    </span>
                  </div>
                </label>
              </Radio.Group>
            </div>

            <div
              className={cn(
                'flex-1 space-y-4',
                mode === 'inherit' && 'pointer-events-none opacity-50',
              )}
              aria-disabled={mode === 'inherit'}
            >
              <div className='flex items-center justify-end gap-2'>
                <Dropdown.Root>
                  <Dropdown.Trigger asChild>
                    <button
                      type='button'
                      className='flex cursor-pointer items-center gap-1 rounded-lg border border-stroke-soft-200 px-2.5 py-1 text-[12px] text-text-sub-600 hover:bg-bg-weak-50'
                    >
                      Templates
                      <ChevronDown className='size-3' />
                    </button>
                  </Dropdown.Trigger>
                  <Dropdown.Content align='end' className='w-56'>
                    {(templatesQuery.data ?? []).length === 0 ? (
                      <Dropdown.Item disabled>
                        Nenhum template salvo
                      </Dropdown.Item>
                    ) : (
                      (templatesQuery.data ?? []).map((t) => (
                        <Dropdown.Item
                          key={t.id}
                          onSelect={() => applyTemplate(t.id)}
                          className='flex items-center justify-between gap-2'
                        >
                          <span className='truncate'>{t.name}</span>
                          <button
                            type='button'
                            aria-label={`Remover template ${t.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(t.id, t.name);
                            }}
                            className='flex size-4 items-center justify-center text-text-soft-400 hover:text-destructive'
                          >
                            <Trash2 className='size-3' />
                          </button>
                        </Dropdown.Item>
                      ))
                    )}
                  </Dropdown.Content>
                </Dropdown.Root>
                <button
                  type='button'
                  onClick={handleSaveAsTemplate}
                  disabled={createTemplate.isPending}
                  className='cursor-pointer rounded-lg border border-stroke-soft-200 px-2.5 py-1 text-[12px] text-text-sub-600 hover:bg-bg-weak-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {createTemplate.isPending ? 'Salvando...' : 'Salvar template'}
                </button>
              </div>

              {isLoading ? (
                <p className='text-sm py-6 text-center text-text-soft-400'>
                  Carregando status...
                </p>
              ) : (
                <ScrollArea.Root
                  type='hover'
                  className='h-[50vh] overflow-hidden'
                >
                  <ScrollArea.Viewport className='size-full'>
                    <div className='flex flex-col gap-4 pb-2 pr-3'>
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
                    orientation='vertical'
                    className='flex w-1.5 touch-none select-none p-px transition-opacity duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100'
                  >
                    <ScrollArea.Thumb className='relative flex-1 rounded-full bg-border' />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
              )}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='justify-end rounded-b-lg bg-[#FCFCFC] px-6 py-4'>
          <div className='flex items-center gap-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
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
