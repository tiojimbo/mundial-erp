'use client';

import { useState } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiSettings4Line,
  RiLockLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import { useNotification } from '@/hooks/use-notification';
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  useCreateArea,
  useDeleteArea,
} from '../hooks/use-departments';
import { StatusEditorDialog } from './status-editor/status-editor-dialog';
import type { DepartmentConfig } from '../types/settings.types';

const DEPT_COLORS = [
  '#7c3aed', '#8b5cf6', '#1e3a5f', '#3b82f6',
  '#06b6d4', '#22c55e', '#84cc16', '#eab308',
  '#f97316', '#ef4444', '#ec4899', '#a78bfa',
  '#92400e', '#1e293b', '#475569', '#94a3b8',
];

export function DepartmentsConfig() {
  const { notification } = useNotification();
  const { data: departments, isLoading } = useDepartments();
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState(DEPT_COLORS[0]);
  const [newDeptIcon, setNewDeptIcon] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [addingAreaFor, setAddingAreaFor] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'dept' | 'area'; id: string; name: string } | null>(null);
  const [statusConfigDept, setStatusConfigDept] = useState<DepartmentConfig | null>(null);

  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const createArea = useCreateArea();
  const deleteArea = useDeleteArea();

  function handleCreateDept() {
    if (!newDeptName) return;
    createDepartment.mutate(
      { name: newDeptName, color: newDeptColor, icon: newDeptIcon || undefined },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Departamento criado.', status: 'success' });
          setNewDeptName('');
          setNewDeptColor(DEPT_COLORS[0]);
          setNewDeptIcon('');
          setIsAddingDept(false);
        },
      },
    );
  }

  function handleCreateArea(departmentId: string) {
    if (!newAreaName) return;
    createArea.mutate(
      { name: newAreaName, departmentId },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Área criada.', status: 'success' });
          setNewAreaName('');
          setAddingAreaFor(null);
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const mutate = deleteTarget.type === 'dept' ? deleteDepartment : deleteArea;
    mutate.mutate(deleteTarget.id, {
      onSuccess: () => {
        notification({ title: 'Sucesso', description: `${deleteTarget.type === 'dept' ? 'Departamento' : 'Área'} removido(a).`, status: 'success' });
        setDeleteTarget(null);
      },
      onError: () => {
        notification({ title: 'Erro', description: `Falha ao remover ${deleteTarget.type === 'dept' ? 'departamento' : 'área'}.`, status: 'error' });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-paragraph-sm text-text-soft-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-label-md text-text-strong-950">Departamentos e Áreas</h3>
          <p className="text-paragraph-sm text-text-sub-600">
            Configure a estrutura organizacional do sistema.
          </p>
        </div>
        <Button.Root
          variant="primary"
          mode="filled"
          size="small"
          onClick={() => setIsAddingDept(true)}
        >
          <Button.Icon as={RiAddLine} />
          Novo Departamento
        </Button.Root>
      </div>

      {/* Add Department Form */}
      {isAddingDept && (
        <div className="flex flex-col gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-label-sm text-text-strong-950">Nome</label>
              <input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Nome do departamento"
                className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
              />
            </div>
            <div className="w-40 space-y-1.5">
              <label className="text-label-sm text-text-strong-950">Ícone</label>
              <input
                value={newDeptIcon}
                onChange={(e) => setNewDeptIcon(e.target.value)}
                placeholder="Ex: ri-briefcase-line"
                className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
              />
            </div>
            <Button.Root variant="primary" mode="filled" size="small" onClick={handleCreateDept} disabled={createDepartment.isPending}>
              Criar
            </Button.Root>
            <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setIsAddingDept(false)}>
              Cancelar
            </Button.Root>
          </div>
          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">Cor</label>
            <div className="flex flex-wrap gap-2">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewDeptColor(c)}
                  className="flex size-7 items-center justify-center rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-base focus:ring-offset-2"
                  style={{ backgroundColor: c }}
                  type="button"
                >
                  {c === newDeptColor && (
                    <RiCheckLine className="size-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Departments List */}
      <div className="space-y-2">
        {(departments ?? []).map((dept) => {
          const isExpanded = expandedDept === dept.id;
          return (
            <div
              key={dept.id}
              className="overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0"
            >
              {/* Department Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                  className="text-text-sub-600"
                >
                  {isExpanded ? (
                    <RiArrowDownSLine className="size-5" />
                  ) : (
                    <RiArrowRightSLine className="size-5" />
                  )}
                </button>
                {dept.color && (
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: dept.color }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-label-sm text-text-strong-950">{dept.name}</p>
                    {dept.isDefault && (
                      <Badge.Root variant="lighter" size="small" color="blue">
                        Padrão
                      </Badge.Root>
                    )}
                    {dept.isProtected && (
                      <Badge.Root variant="lighter" size="small" color="orange">
                        <RiLockLine className="size-3" />
                        Protegido
                      </Badge.Root>
                    )}
                    <Badge.Root variant="lighter" size="small" color={dept.isActive ? 'green' : 'gray'}>
                      {dept.isActive ? 'Ativo' : 'Inativo'}
                    </Badge.Root>
                  </div>
                  <p className="text-paragraph-xs text-text-sub-600">
                    {dept.areas.length} área(s)
                  </p>
                </div>
                <Button.Root
                  variant="neutral"
                  mode="stroke"
                  size="xsmall"
                  onClick={() => setStatusConfigDept(dept)}
                >
                  <Button.Icon as={RiSettings4Line} />
                  Gerenciar Status
                </Button.Root>
                <button
                  onClick={() => setDeleteTarget({ type: 'dept', id: dept.id, name: dept.name })}
                  disabled={dept.isProtected}
                  className="rounded-md p-1.5 text-text-sub-600 hover:bg-error-lighter hover:text-error-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-sub-600"
                >
                  <RiDeleteBinLine className="size-4" />
                </button>
              </div>

              {/* Areas */}
              {isExpanded && (
                <div className="border-t border-stroke-soft-200 bg-bg-weak-50 p-4">
                  <div className="space-y-2">
                    {dept.areas.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-label-sm text-text-strong-950">{area.name}</p>
                          {area.isDefault && (
                            <Badge.Root variant="lighter" size="small" color="blue">
                              Padrão
                            </Badge.Root>
                          )}
                          <Badge.Root variant="lighter" size="small" color={area.isActive ? 'green' : 'gray'}>
                            {area.isActive ? 'Ativo' : 'Inativo'}
                          </Badge.Root>
                        </div>
                        <button
                          onClick={() => setDeleteTarget({ type: 'area', id: area.id, name: area.name })}
                          className="rounded-md p-1.5 text-text-sub-600 hover:bg-error-lighter hover:text-error-base"
                        >
                          <RiDeleteBinLine className="size-4" />
                        </button>
                      </div>
                    ))}

                    {/* Add Area Form */}
                    {addingAreaFor === dept.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={newAreaName}
                          onChange={(e) => setNewAreaName(e.target.value)}
                          placeholder="Nome da área"
                          className="flex-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
                          autoFocus
                        />
                        <Button.Root variant="primary" mode="filled" size="small" onClick={() => handleCreateArea(dept.id)}>
                          Criar
                        </Button.Root>
                        <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setAddingAreaFor(null)}>
                          Cancelar
                        </Button.Root>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingAreaFor(dept.id)}
                        className="flex items-center gap-1.5 text-label-sm text-primary-base hover:underline"
                      >
                        <RiAddLine className="size-4" />
                        Adicionar Área
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>Remover {deleteTarget.type === 'dept' ? 'Departamento' : 'Área'}</Modal.Title>
              <Modal.Description>
                Tem certeza que deseja remover <strong>{deleteTarget.name}</strong>?
              </Modal.Description>
            </Modal.Header>
            <Modal.Footer>
              <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button.Root>
              <Button.Root variant="error" mode="filled" size="small" onClick={handleDelete}>
                Remover
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}

      {/* Status Editor Dialog */}
      {statusConfigDept && (
        <StatusEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfigDept(null);
          }}
          targetType='department'
          targetId={statusConfigDept.id}
          targetName={statusConfigDept.name}
          departmentId={statusConfigDept.id}
          initialMode='custom'
        />
      )}
    </div>
  );
}
