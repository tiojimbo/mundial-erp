'use client';

import { useState } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiLockLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import { useNotification } from '@/hooks/use-notification';
import {
  useProcesses,
  useCreateProcess,
  useDeleteProcess,
  useCreateActivity,
  useDeleteActivity,
} from '../hooks/use-processes';
import { useDepartments } from '../hooks/use-departments';
import type { ProcessConfig } from '../types/settings.types';

export function ProcessesConfig() {
  const { notification } = useNotification();
  const { data: processes, isLoading } = useProcesses();
  const { data: departments } = useDepartments();
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
  const [isAddingProcess, setIsAddingProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessAreaId, setNewProcessAreaId] = useState('');
  const [addingActivityFor, setAddingActivityFor] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivitySla, setNewActivitySla] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'process' | 'activity'; id: string; name: string } | null>(null);

  const createProcess = useCreateProcess();
  const deleteProcess = useDeleteProcess();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();

  const allAreas = (departments ?? []).flatMap((d) =>
    d.areas.map((a) => ({ ...a, departmentName: d.name })),
  );

  function handleCreateProcess() {
    if (!newProcessName || !newProcessAreaId) return;
    createProcess.mutate(
      { name: newProcessName, areaId: newProcessAreaId },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Processo criado.', status: 'success' });
          setNewProcessName('');
          setNewProcessAreaId('');
          setIsAddingProcess(false);
        },
      },
    );
  }

  function handleCreateActivity(processId: string) {
    if (!newActivityName) return;
    const existingActivities = (processes ?? []).find((p) => p.id === processId)?.activities ?? [];
    createActivity.mutate(
      {
        name: newActivityName,
        processId,
        order: existingActivities.length + 1,
        slaHours: newActivitySla ? parseInt(newActivitySla, 10) : undefined,
      },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Atividade criada.', status: 'success' });
          setNewActivityName('');
          setNewActivitySla('');
          setAddingActivityFor(null);
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const mutate = deleteTarget.type === 'process' ? deleteProcess : deleteActivity;
    mutate.mutate(deleteTarget.id, {
      onSuccess: () => {
        notification({ title: 'Sucesso', description: `${deleteTarget.type === 'process' ? 'Processo' : 'Atividade'} removido(a).`, status: 'success' });
        setDeleteTarget(null);
      },
      onError: () => {
        notification({ title: 'Erro', description: `Falha ao remover ${deleteTarget.type === 'process' ? 'processo' : 'atividade'}.`, status: 'error' });
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
          <h3 className="text-label-md text-text-strong-950">Processos e Atividades</h3>
          <p className="text-paragraph-sm text-text-sub-600">
            Configure os processos BPM e suas atividades com SLA.
          </p>
        </div>
        <Button.Root
          variant="primary"
          mode="filled"
          size="small"
          onClick={() => setIsAddingProcess(true)}
        >
          <Button.Icon as={RiAddLine} />
          Novo Processo
        </Button.Root>
      </div>

      {/* Add Process Form */}
      {isAddingProcess && (
        <div className="flex items-end gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-label-sm text-text-strong-950">Nome do Processo</label>
            <input
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              placeholder="Ex: Cadastro e Manutenção de Clientes"
              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
            />
          </div>
          <div className="w-64 space-y-1.5">
            <label className="text-label-sm text-text-strong-950">Área</label>
            <select
              value={newProcessAreaId}
              onChange={(e) => setNewProcessAreaId(e.target.value)}
              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
            >
              <option value="">Selecione...</option>
              {allAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.departmentName} / {area.name}
                </option>
              ))}
            </select>
          </div>
          <Button.Root variant="primary" mode="filled" size="small" onClick={handleCreateProcess} disabled={createProcess.isPending}>
            Criar
          </Button.Root>
          <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setIsAddingProcess(false)}>
            Cancelar
          </Button.Root>
        </div>
      )}

      {/* Processes List */}
      <div className="space-y-2">
        {(processes ?? []).map((process) => {
          const isExpanded = expandedProcess === process.id;
          const sortedActivities = [...process.activities].sort((a, b) => a.order - b.order);
          const isBpm = process.processType === 'BPM';

          return (
            <div
              key={process.id}
              className="overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0"
            >
              {/* Process Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpandedProcess(isExpanded ? null : process.id)}
                  className="text-text-sub-600"
                >
                  {isExpanded ? (
                    <RiArrowDownSLine className="size-5" />
                  ) : (
                    <RiArrowRightSLine className="size-5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-label-sm text-text-strong-950">{process.name}</p>
                    <Badge.Root variant="lighter" size="small" color={isBpm ? 'purple' : 'sky'}>
                      {process.processType}
                    </Badge.Root>
                    {process.isProtected && (
                      <Badge.Root variant="lighter" size="small" color="orange">
                        <RiLockLine className="size-3" />
                        Protegido
                      </Badge.Root>
                    )}
                    <Badge.Root variant="lighter" size="small" color={process.isActive ? 'green' : 'gray'}>
                      {process.isActive ? 'Ativo' : 'Inativo'}
                    </Badge.Root>
                  </div>
                  <p className="text-paragraph-xs text-text-sub-600">
                    {process.area ? `${process.area.name}` : 'Sem área'}
                    {isBpm ? ` - ${process.activities.length} atividade(s)` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget({ type: 'process', id: process.id, name: process.name })}
                  disabled={process.isProtected}
                  className="rounded-md p-1.5 text-text-sub-600 hover:bg-error-lighter hover:text-error-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-sub-600"
                >
                  <RiDeleteBinLine className="size-4" />
                </button>
              </div>

              {/* Activities (only for BPM processes) */}
              {isExpanded && isBpm && (
                <div className="border-t border-stroke-soft-200 bg-bg-weak-50 p-4">
                  <div className="space-y-2">
                    {sortedActivities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 items-center justify-center rounded-full bg-bg-weak-50 text-label-xs text-text-sub-600">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-label-sm text-text-strong-950">{activity.name}</p>
                            {activity.slaHours && (
                              <p className="text-paragraph-xs text-text-sub-600">
                                SLA: {activity.slaHours}h
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge.Root variant="lighter" size="small" color={activity.isActive ? 'green' : 'gray'}>
                            {activity.isActive ? 'Ativo' : 'Inativo'}
                          </Badge.Root>
                          <button
                            onClick={() => setDeleteTarget({ type: 'activity', id: activity.id, name: activity.name })}
                            className="rounded-md p-1.5 text-text-sub-600 hover:bg-error-lighter hover:text-error-base"
                          >
                            <RiDeleteBinLine className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Activity Form */}
                    {addingActivityFor === process.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={newActivityName}
                          onChange={(e) => setNewActivityName(e.target.value)}
                          placeholder="Nome da atividade"
                          className="flex-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
                          autoFocus
                        />
                        <input
                          value={newActivitySla}
                          onChange={(e) => setNewActivitySla(e.target.value)}
                          placeholder="SLA (h)"
                          type="number"
                          className="w-24 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
                        />
                        <Button.Root variant="primary" mode="filled" size="small" onClick={() => handleCreateActivity(process.id)}>
                          Criar
                        </Button.Root>
                        <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setAddingActivityFor(null)}>
                          Cancelar
                        </Button.Root>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingActivityFor(process.id)}
                        className="flex items-center gap-1.5 text-label-sm text-primary-base hover:underline"
                      >
                        <RiAddLine className="size-4" />
                        Adicionar Atividade
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LIST processes - show message when expanded */}
              {isExpanded && !isBpm && (
                <div className="border-t border-stroke-soft-200 bg-bg-weak-50 p-4">
                  <p className="text-paragraph-sm text-text-soft-400 text-center py-2">
                    Processos do tipo LIST não possuem atividades.
                  </p>
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
              <Modal.Title>Remover {deleteTarget.type === 'process' ? 'Processo' : 'Atividade'}</Modal.Title>
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
    </div>
  );
}
