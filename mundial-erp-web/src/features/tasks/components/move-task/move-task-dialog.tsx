'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/lib/cn';
import { useStatusesByList } from '@/features/settings/hooks/use-statuses';
import { useMovePreview } from '../../hooks/use-move-preview';
import { useMoveTask } from '../../hooks/use-move-task';
import { ListTargetSelector, type ListOption } from './list-target-selector';
import { StatusReconciliationTable } from './status-reconciliation-table';

type Step = 'select' | 'previewing' | 'reconcile';

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
  const [step, setStep] = React.useState<Step>('select');
  const [target, setTarget] = React.useState<ListOption | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [cfIgnore, setCfIgnore] = React.useState<Record<string, boolean>>({});
  const firedRef = React.useRef<string | null>(null);

  const preview = useMovePreview(taskIds, target?.id ?? null);
  const targetStatuses = useStatusesByList(target?.id ?? null);
  const moveTask = useMoveTask();

  const reset = React.useCallback(() => {
    setStep('select');
    setTarget(null);
    setMapping({});
    setCfIgnore({});
    firedRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const close = () => onOpenChange(false);

  function fireMove(
    statusMapping: { sourceStatusId: string; targetStatusId: string }[],
    customFieldActions: { customFieldId: string; action: 'KEEP' | 'CLEAR' }[],
  ) {
    if (!target) return;
    moveTask.mutate(
      { targetListId: target.id, taskIds, statusMapping, customFieldActions },
      {
        onSuccess: () => {
          close();
          onMoved?.();
        },
      },
    );
  }

  // Tela 1 -> ao selecionar a lista, o preview decide: move direto (sem
  // reconciliacao) ou avança pra tela 2. Paridade Hoppe.
  React.useEffect(() => {
    if (step !== 'previewing' || !target) return;
    if (preview.isFetching || !preview.data) return;
    if (firedRef.current === target.id) return;
    firedRef.current = target.id;

    const data = preview.data;
    if (data.needsReconciliation) {
      setStep('reconcile');
      return;
    }
    fireMove(
      data.statusDiffs.map((d) => ({
        sourceStatusId: d.sourceStatusId,
        targetStatusId: d.autoTargetStatusId as string,
      })),
      [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, target, preview.isFetching, preview.data]);

  function handleSelect(list: ListOption) {
    firedRef.current = null;
    setMapping({});
    setCfIgnore({});
    setTarget(list);
    setStep('previewing');
  }

  const data = preview.data;
  const onlyInSource = data?.customFieldDiffs.onlyInSource ?? [];
  const pendingStatuses =
    data?.statusDiffs.filter((d) => d.autoTargetStatusId === null) ?? [];
  const canMove =
    step === 'reconcile' &&
    pendingStatuses.every((d) => !!mapping[d.sourceStatusId]) &&
    !moveTask.isPending;

  function handleReconcileMove() {
    if (!data) return;
    fireMove(
      data.statusDiffs.map((d) => ({
        sourceStatusId: d.sourceStatusId,
        targetStatusId:
          mapping[d.sourceStatusId] ?? (d.autoTargetStatusId as string),
      })),
      onlyInSource.map((cf) => ({
        customFieldId: cf.customFieldId,
        action: cfIgnore[cf.customFieldId] ? 'CLEAR' : 'KEEP',
      })),
    );
  }

  const isReconcile = step === 'reconcile';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4' />
        <Dialog.Content
          className={cn(
            'shadow-lg fixed left-[50%] top-[50%] z-50 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg border border-[oklch(0.922_0_0)] bg-white',
            isReconcile ? 'max-w-[520px] gap-4 p-6' : 'max-w-[400px] p-4',
          )}
        >
          <Dialog.Title
            className={cn(
              'font-semibold leading-none text-[oklch(0.145_0_0)]',
              isReconcile ? 'text-[18px]' : 'text-[16px]',
            )}
          >
            {isReconcile ? 'Reconciliar Mover' : 'Mover para lista'}
          </Dialog.Title>
          <Dialog.Description className='sr-only'>
            {isReconcile
              ? 'Mapeie os status sem equivalente no destino'
              : 'Escolha a lista de destino'}
          </Dialog.Description>

          {!isReconcile ? (
            <div className='mt-3 flex flex-col gap-3'>
              <div className='flex h-8 w-full items-center rounded-lg bg-[oklch(0.97_0_0)] p-0.5 text-[12px]'>
                <span className='shadow-xs flex h-full flex-1 items-center justify-center rounded-md bg-white font-medium text-[oklch(0.145_0_0)]'>
                  Mover
                </span>
                <span
                  title='Disponível em breve'
                  className='flex h-full flex-1 cursor-not-allowed items-center justify-center text-[oklch(0.556_0_0)]'
                >
                  Adicionar à lista
                </span>
              </div>

              <ListTargetSelector
                selectedListId={target?.id ?? null}
                excludeListId={sourceListId ?? undefined}
                onSelect={handleSelect}
              />

              {step === 'previewing' && (
                <p className='text-center text-[12px] text-[oklch(0.556_0_0)]'>
                  Verificando destino...
                </p>
              )}
            </div>
          ) : (
            <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto'>
              <StatusReconciliationTable
                statusDiffs={data?.statusDiffs ?? []}
                targetStatuses={targetStatuses.data ?? []}
                mapping={mapping}
                onChange={(src, tgt) =>
                  setMapping((m) => ({ ...m, [src]: tgt }))
                }
              />

              {onlyInSource.length > 0 && (
                <div className='border-t border-[oklch(0.922_0_0)] pt-4'>
                  <h4 className='mb-2 text-[14px] font-medium text-[oklch(0.145_0_0)]'>
                    Campos Personalizados
                  </h4>
                  <p className='mb-3 text-[12px] text-[oklch(0.556_0_0)]'>
                    Estes campos existem apenas na lista de origem. Escolha o
                    que fazer com cada um:
                  </p>
                  <div className='flex flex-col gap-2'>
                    {onlyInSource.map((cf) => (
                      <div
                        key={cf.customFieldId}
                        className='flex items-center gap-3'
                      >
                        <span className='flex-1 truncate text-[14px] text-[oklch(0.145_0_0)]'>
                          {cf.customFieldName}
                        </span>
                        <span className='text-[12px] font-medium text-[oklch(0.556_0_0)]'>
                          Ignorar
                        </span>
                        <Switch.Root
                          checked={cfIgnore[cf.customFieldId] ?? false}
                          onCheckedChange={(v) =>
                            setCfIgnore((s) => ({
                              ...s,
                              [cf.customFieldId]: v,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='flex items-center justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={close}
                  className='shadow-xs inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[oklch(0.922_0_0)] bg-white px-3 text-[14px] font-medium outline-none transition-colors hover:bg-[oklch(0.97_0_0)]'
                >
                  Cancelar
                </button>
                <button
                  type='button'
                  disabled={!canMove}
                  onClick={handleReconcileMove}
                  className='inline-flex h-8 cursor-pointer items-center justify-center rounded-md bg-[oklch(0.205_0_0)] px-3 text-[14px] font-medium text-[oklch(0.985_0_0)] outline-none transition-colors hover:bg-[oklch(0.3_0_0)] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {moveTask.isPending ? 'Movendo...' : 'Mover'}
                </button>
              </div>
            </div>
          )}

          <Dialog.Close asChild>
            <button
              type='button'
              aria-label='Fechar'
              className='absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none'
            >
              <RiCloseLine className='size-4' />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
