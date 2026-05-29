'use client';

import * as React from 'react';
import { RiDragMoveLine, RiArrowLeftLine } from '@remixicon/react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { useStatusesByList } from '@/features/settings/hooks/use-statuses';
import { useMovePreview } from '../../hooks/use-move-preview';
import { useMoveTask } from '../../hooks/use-move-task';
import type { CustomFieldMoveAction } from '../../services/move-task.service';
import { ListTargetSelector, type ListOption } from './list-target-selector';
import { StatusReconciliationTable } from './status-reconciliation-table';

export function MoveTaskDialog({
  open,
  onOpenChange,
  taskIds,
  sourceListId,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  sourceListId?: string | null;
  onMoved?: () => void;
}) {
  const [target, setTarget] = React.useState<ListOption | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [cfActions, setCfActions] = React.useState<
    Record<string, CustomFieldMoveAction>
  >({});

  const preview = useMovePreview(taskIds, target?.id ?? null);
  const targetStatuses = useStatusesByList(target?.id ?? null);
  const moveTask = useMoveTask();

  React.useEffect(() => {
    if (!open) {
      setTarget(null);
      setMapping({});
      setCfActions({});
    }
  }, [open]);

  // Trocar de destino zera as escolhas manuais do destino anterior.
  React.useEffect(() => {
    setMapping({});
    setCfActions({});
  }, [target?.id]);

  const data = preview.data;
  const onlyInSource = data?.customFieldDiffs.onlyInSource ?? [];

  const resolvedMapping = React.useMemo(() => {
    if (!data) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const d of data.statusDiffs) {
      const resolved = mapping[d.sourceStatusId] ?? d.autoTargetStatusId;
      if (resolved) out[d.sourceStatusId] = resolved;
    }
    return out;
  }, [data, mapping]);

  const canMove =
    !!data &&
    data.statusDiffs.every((d) => !!resolvedMapping[d.sourceStatusId]) &&
    !moveTask.isPending;

  function handleMove() {
    if (!target || !data) return;
    moveTask.mutate(
      {
        targetListId: target.id,
        taskIds,
        statusMapping: data.statusDiffs.map((d) => ({
          sourceStatusId: d.sourceStatusId,
          targetStatusId: resolvedMapping[d.sourceStatusId],
        })),
        customFieldActions: onlyInSource.map((cf) => ({
          customFieldId: cf.customFieldId,
          action: cfActions[cf.customFieldId] ?? 'KEEP',
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onMoved?.();
        },
      },
    );
  }

  const count = taskIds.length;

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-lg'>
        <Modal.Header
          icon={RiDragMoveLine}
          title={`Mover ${count} ${count === 1 ? 'tarefa' : 'tarefas'}`}
          description='Escolha a lista de destino. O status é remapeado automaticamente.'
        />
        <Modal.Body className='flex flex-col gap-4'>
          {!target ? (
            <ListTargetSelector
              selectedListId={null}
              excludeListId={sourceListId ?? undefined}
              onSelect={setTarget}
            />
          ) : (
            <>
              <div className='flex items-center justify-between rounded-md bg-bg-weak-50 px-3 py-2'>
                <div className='flex flex-col'>
                  <span className='text-[11px] text-text-soft-400'>
                    Destino
                  </span>
                  <span className='text-[13px] font-medium text-text-strong-950'>
                    {target.folderName ? `${target.folderName} / ` : ''}
                    {target.name}
                  </span>
                </div>
                <Button.Root
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  onClick={() => setTarget(null)}
                >
                  <Button.Icon as={RiArrowLeftLine} />
                  Trocar
                </Button.Root>
              </div>

              {preview.isLoading && (
                <p className='py-4 text-center text-[13px] text-text-soft-400'>
                  Calculando o que muda...
                </p>
              )}

              {data && (
                <>
                  {data.statusDiffs.length > 0 && (
                    <div className='flex flex-col gap-2'>
                      <p className='text-[12px] font-medium text-text-sub-600'>
                        Status no destino
                      </p>
                      {data.needsReconciliation && (
                        <p className='text-amber-600 text-[12px]'>
                          Alguns status não têm equivalente no destino. Escolha
                          pra onde vão.
                        </p>
                      )}
                      <StatusReconciliationTable
                        statusDiffs={data.statusDiffs}
                        targetStatuses={targetStatuses.data ?? []}
                        mapping={mapping}
                        onChange={(src, tgt) =>
                          setMapping((m) => ({ ...m, [src]: tgt }))
                        }
                      />
                    </div>
                  )}

                  {onlyInSource.length > 0 && (
                    <div className='flex flex-col gap-2'>
                      <p className='text-[12px] font-medium text-text-sub-600'>
                        Campos que não existem no destino
                      </p>
                      {onlyInSource.map((cf) => {
                        const action = cfActions[cf.customFieldId] ?? 'KEEP';
                        return (
                          <div
                            key={cf.customFieldId}
                            className='flex items-center justify-between gap-2 text-[12px]'
                          >
                            <span className='truncate text-text-strong-950'>
                              {cf.customFieldName}
                            </span>
                            <div className='flex overflow-hidden rounded-md border border-stroke-soft-200'>
                              {(['KEEP', 'CLEAR'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type='button'
                                  onClick={() =>
                                    setCfActions((s) => ({
                                      ...s,
                                      [cf.customFieldId]: opt,
                                    }))
                                  }
                                  className={
                                    action === opt
                                      ? 'bg-bg-weak-50 px-2 py-1 font-medium text-text-strong-950'
                                      : 'px-2 py-1 text-text-soft-400'
                                  }
                                >
                                  {opt === 'KEEP' ? 'Manter' : 'Limpar'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {data.statusDiffs.length === 0 && (
                    <p className='py-2 text-center text-[13px] text-text-soft-400'>
                      Nada a mover (as tarefas já estão nesta lista).
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canMove}
            onClick={handleMove}
          >
            {moveTask.isPending ? 'Movendo...' : 'Mover'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
