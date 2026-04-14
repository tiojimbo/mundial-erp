'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RiAddLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Dropdown from '@/components/ui/dropdown';
import { useNotification } from '@/hooks/use-notification';
import { StatusIcon } from '@/features/work-items/components/status-icon';
import type { WorkItemStatus } from '@/features/work-items/types/work-item.types';
import {
  useWorkflowStatuses,
  useCreateWorkflowStatus,
  useUpdateWorkflowStatus,
  useDeleteWorkflowStatus,
} from '../hooks/use-workflow-statuses';

const STATUS_COLORS = [
  '#7c3aed', '#8b5cf6', '#1e3a5f', '#3b82f6',
  '#06b6d4', '#22c55e', '#84cc16', '#eab308',
  '#f97316', '#ef4444', '#ec4899', '#a78bfa',
  '#92400e', '#1e293b', '#475569', '#94a3b8',
];

type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  NOT_STARTED: 'Not Started',
  ACTIVE: 'Active',
  DONE: 'Done',
  CLOSED: 'Closed',
};

const CATEGORY_ORDER: StatusCategory[] = ['NOT_STARTED', 'ACTIVE', 'DONE', 'CLOSED'];

type StatusConfigProps = {
  departmentId: string;
  departmentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StatusConfig({ departmentId, departmentName, open, onOpenChange }: StatusConfigProps) {
  const { notification } = useNotification();
  const { data: statuses, isLoading } = useWorkflowStatuses(departmentId);

  const createStatus = useCreateWorkflowStatus();
  const updateStatus = useUpdateWorkflowStatus();
  const deleteStatus = useDeleteWorkflowStatus();

  const [addingCategory, setAddingCategory] = useState<StatusCategory | null>(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(STATUS_COLORS[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkItemStatus | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingCategory && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingCategory]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  function getStatusesByCategory(category: StatusCategory): WorkItemStatus[] {
    return (statuses ?? []).filter((s) => s.category === category);
  }

  function handleAddStatus(category: StatusCategory) {
    if (!newStatusName.trim()) return;
    createStatus.mutate(
      {
        name: newStatusName.trim(),
        category,
        color: newStatusColor,
        departmentId,
      },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Status criado.', status: 'success' });
          setNewStatusName('');
          setNewStatusColor(STATUS_COLORS[0]);
          setAddingCategory(null);
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao criar status.', status: 'error' });
        },
      },
    );
  }

  function handleRename(id: string) {
    if (!renameValue.trim()) return;
    updateStatus.mutate(
      { id, name: renameValue.trim() },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Status renomeado.', status: 'success' });
          setRenamingId(null);
          setRenameValue('');
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao renomear status.', status: 'error' });
        },
      },
    );
  }

  function handleColorChange(id: string, color: string) {
    updateStatus.mutate(
      { id, color },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Cor atualizada.', status: 'success' });
          setEditingColorId(null);
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao atualizar cor.', status: 'error' });
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteStatus.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Status removido.', status: 'success' });
          setDeleteTarget(null);
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao remover status.', status: 'error' });
        },
      },
    );
  }

  function startRename(status: WorkItemStatus) {
    setRenamingId(status.id);
    setRenameValue(status.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelAdd() {
    setAddingCategory(null);
    setNewStatusName('');
    setNewStatusColor(STATUS_COLORS[0]);
  }

  return (
    <>
      <Modal.Root open={open} onOpenChange={onOpenChange}>
        <Modal.Content className="max-w-[560px]">
          <Modal.Header
            title={`Gerenciar Status \u2014 ${departmentName}`}
            description="Configure os status do fluxo de trabalho deste departamento."
          />
          <Modal.Body className="max-h-[60vh] overflow-y-auto space-y-5">
            {isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <p className="text-paragraph-sm text-text-soft-400">Carregando...</p>
              </div>
            ) : (
              CATEGORY_ORDER.map((category) => {
                const categoryStatuses = getStatusesByCategory(category);
                return (
                  <div key={category} className="space-y-2">
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-subheading-xs uppercase text-text-soft-400">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <button
                        onClick={() => {
                          setAddingCategory(category);
                          setNewStatusColor(STATUS_COLORS[0]);
                        }}
                        className="flex items-center gap-1 text-label-xs text-primary-base hover:underline"
                      >
                        <RiAddLine className="size-3.5" />
                        Adicionar
                      </button>
                    </div>

                    {/* Status List */}
                    <div className="space-y-1">
                      {categoryStatuses.map((status) => (
                        <div
                          key={status.id}
                          className="flex items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2"
                        >
                          {/* Status Icon */}
                          <StatusIcon category={status.category} color={status.color} size={16} />

                          {/* Name (or rename input) */}
                          {renamingId === status.id ? (
                            <div className="flex flex-1 items-center gap-1.5">
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(status.id);
                                  if (e.key === 'Escape') cancelRename();
                                }}
                                className="flex-1 rounded border border-stroke-soft-200 bg-bg-white-0 px-2 py-0.5 text-paragraph-sm outline-none focus:border-primary-base"
                              />
                              <button
                                onClick={() => handleRename(status.id)}
                                className="rounded p-0.5 text-primary-base hover:bg-primary-alpha-10"
                              >
                                <RiCheckLine className="size-4" />
                              </button>
                              <button
                                onClick={cancelRename}
                                className="rounded p-0.5 text-text-sub-600 hover:bg-bg-weak-50"
                              >
                                <RiCloseLine className="size-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="flex-1 text-label-sm text-text-strong-950">
                              {status.name}
                            </span>
                          )}

                          {/* Color Dot + Picker */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setEditingColorId(editingColorId === status.id ? null : status.id)
                              }
                              className="flex size-5 items-center justify-center rounded-full transition hover:ring-2 hover:ring-stroke-soft-200"
                            >
                              <span
                                className="size-3.5 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                            </button>
                            {editingColorId === status.id && (
                              <ColorPickerPopover
                                currentColor={status.color}
                                onSelect={(color) => handleColorChange(status.id, color)}
                                onClose={() => setEditingColorId(null)}
                              />
                            )}
                          </div>

                          {/* Actions Menu */}
                          {renamingId !== status.id && (
                            <Dropdown.Root>
                              <Dropdown.Trigger asChild>
                                <button className="rounded p-0.5 text-text-sub-600 hover:bg-bg-weak-50">
                                  <RiMoreLine className="size-4" />
                                </button>
                              </Dropdown.Trigger>
                              <Dropdown.Content align="end" className="w-40">
                                <Dropdown.Item onSelect={() => startRename(status)}>
                                  <Dropdown.ItemIcon as={RiEditLine} />
                                  Renomear
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onSelect={() => {
                                    if (categoryStatuses.length <= 1) return;
                                    setDeleteTarget(status);
                                  }}
                                  disabled={categoryStatuses.length <= 1}
                                >
                                  <Dropdown.ItemIcon as={RiDeleteBinLine} />
                                  Excluir
                                </Dropdown.Item>
                              </Dropdown.Content>
                            </Dropdown.Root>
                          )}
                        </div>
                      ))}

                      {/* Empty state */}
                      {categoryStatuses.length === 0 && addingCategory !== category && (
                        <p className="py-2 text-center text-paragraph-xs text-text-soft-400">
                          Nenhum status nesta categoria.
                        </p>
                      )}

                      {/* Add Inline Form */}
                      {addingCategory === category && (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-3 py-2">
                          <div className="relative">
                            <button
                              onClick={() =>
                                setEditingColorId(editingColorId === '__new__' ? null : '__new__')
                              }
                              className="flex size-5 items-center justify-center rounded-full transition hover:ring-2 hover:ring-stroke-soft-200"
                            >
                              <span
                                className="size-3.5 rounded-full"
                                style={{ backgroundColor: newStatusColor }}
                              />
                            </button>
                            {editingColorId === '__new__' && (
                              <ColorPickerPopover
                                currentColor={newStatusColor}
                                onSelect={(color) => {
                                  setNewStatusColor(color);
                                  setEditingColorId(null);
                                }}
                                onClose={() => setEditingColorId(null)}
                              />
                            )}
                          </div>
                          <input
                            ref={addInputRef}
                            value={newStatusName}
                            onChange={(e) => setNewStatusName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddStatus(category);
                              if (e.key === 'Escape') cancelAdd();
                            }}
                            placeholder="Nome do status"
                            className="flex-1 bg-transparent text-paragraph-sm outline-none placeholder:text-text-soft-400"
                          />
                          <button
                            onClick={() => handleAddStatus(category)}
                            disabled={!newStatusName.trim() || createStatus.isPending}
                            className="rounded p-0.5 text-primary-base hover:bg-primary-alpha-10 disabled:opacity-50"
                          >
                            <RiCheckLine className="size-4" />
                          </button>
                          <button
                            onClick={cancelAdd}
                            className="rounded p-0.5 text-text-sub-600 hover:bg-bg-weak-50"
                          >
                            <RiCloseLine className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Modal.Body>
          <Modal.Footer className="justify-end">
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="stroke" size="small">
                Fechar
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Modal.Content>
            <Modal.Header
              title="Remover Status"
              description={`Tem certeza que deseja remover o status "${deleteTarget.name}"?`}
            />
            <Modal.Footer>
              <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button.Root>
              <Button.Root
                variant="error"
                mode="filled"
                size="small"
                onClick={handleDelete}
                disabled={deleteStatus.isPending}
              >
                Remover
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Color Picker Popover (inline, no Radix Popover needed)            */
/* ------------------------------------------------------------------ */

function ColorPickerPopover({
  currentColor,
  onSelect,
  onClose,
}: {
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-regular-md"
    >
      <div className="grid grid-cols-8 gap-1.5">
        {STATUS_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className="flex size-5 items-center justify-center rounded-full transition hover:scale-110"
            style={{ backgroundColor: color }}
          >
            {color.toLowerCase() === currentColor.toLowerCase() && (
              <RiCheckLine className="size-3 text-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
