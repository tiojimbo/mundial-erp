'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/cn';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/use-custom-field-definitions';
import type { CustomFieldDefinition } from '@/features/custom-fields/types/custom-field.types';
import {
  useProcessViews,
  processViewsKeys,
} from '@/features/process-views/hooks/use-process-views';
import { useUpdateProcessView } from '@/features/process-views/hooks/use-update-process-view';
import { processViewsService } from '@/features/process-views/services/process-views.service';

type ColumnFieldsDrawerProps = {
  open: boolean;
  onClose: () => void;
  listId: string;
};

type BucketKey = 'taskType' | 'list' | 'folder' | 'space' | 'workspace';

type StandardColumnKey =
  | 'STATUS'
  | 'ASSIGNEE'
  | 'START_DATE'
  | 'DUE_DATE'
  | 'COMMENTS';

const STANDARD_COLUMNS: { key: StandardColumnKey; label: string }[] = [
  { key: 'STATUS', label: 'Status' },
  { key: 'ASSIGNEE', label: 'Responsável' },
  { key: 'START_DATE', label: 'Início' },
  { key: 'DUE_DATE', label: 'Prazo' },
  { key: 'COMMENTS', label: 'Comentários' },
];

const BUCKET_ORDER: BucketKey[] = [
  'taskType',
  'list',
  'folder',
  'space',
  'workspace',
];

const BUCKET_LABEL: Record<BucketKey, string> = {
  taskType: 'Campos do tipo',
  list: 'Campos desta lista',
  folder: 'Herdados da pasta',
  space: 'Herdados do departamento',
  workspace: 'Campos gerais',
};

export function ColumnFieldsDrawer({
  open,
  onClose,
  listId,
}: ColumnFieldsDrawerProps) {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const definitionsQuery = useCustomFieldDefinitions(
    listId ? { listId } : undefined,
  );
  const viewsQuery = useProcessViews(listId);
  const updateView = useUpdateProcessView(listId);

  const listView = useMemo(
    () => (viewsQuery.data ?? []).find((v) => v.viewType === 'LIST') ?? null,
    [viewsQuery.data],
  );

  const visibleIds = useMemo(() => {
    const cfg = listView?.config as
      | { visibleCustomFields?: string[] }
      | undefined;
    return new Set(
      Array.isArray(cfg?.visibleCustomFields) ? cfg!.visibleCustomFields : [],
    );
  }, [listView]);

  const hiddenStandardSet = useMemo(() => {
    const cfg = listView?.config as
      | { hiddenStandardColumns?: string[] }
      | undefined;
    return new Set(
      Array.isArray(cfg?.hiddenStandardColumns)
        ? cfg!.hiddenStandardColumns
        : [],
    );
  }, [listView]);

  const filteredStandard = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return STANDARD_COLUMNS;
    return STANDARD_COLUMNS.filter((c) => c.label.toLowerCase().includes(term));
  }, [search]);

  const groups = useMemo(() => {
    const grouped = definitionsQuery.data;
    if (!grouped)
      return [] as {
        key: BucketKey;
        label: string;
        defs: CustomFieldDefinition[];
      }[];
    const seen = new Set<string>();
    const term = search.trim().toLowerCase();
    const out: {
      key: BucketKey;
      label: string;
      defs: CustomFieldDefinition[];
    }[] = [];
    for (const key of BUCKET_ORDER) {
      const raw = (grouped[key] ?? []) as CustomFieldDefinition[];
      const dedup = raw.filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        if (term && !d.name.toLowerCase().includes(term)) return false;
        return true;
      });
      if (dedup.length === 0) continue;
      out.push({ key, label: BUCKET_LABEL[key], defs: dedup });
    }
    return out;
  }, [definitionsQuery.data, search]);

  const toggle = async (defId: string, next: boolean) => {
    const current = new Set(visibleIds);
    if (next) current.add(defId);
    else current.delete(defId);
    const visibleCustomFields = Array.from(current);
    setBusy(true);
    try {
      if (listView) {
        const cfg = (listView.config ?? {}) as Record<string, unknown>;
        await updateView.mutateAsync({
          id: listView.id,
          payload: { config: { ...cfg, visibleCustomFields } },
        });
      } else {
        await processViewsService.create({
          processId: listId,
          name: 'Lista',
          viewType: 'LIST',
          config: { visibleCustomFields },
        });
        qc.invalidateQueries({ queryKey: processViewsKeys.list(listId) });
      }
    } catch {
      toast.error('Erro ao atualizar colunas.');
    } finally {
      setBusy(false);
    }
  };

  const toggleStandard = async (key: StandardColumnKey, visible: boolean) => {
    const current = new Set(hiddenStandardSet);
    if (visible) current.delete(key);
    else current.add(key);
    const hiddenStandardColumns = Array.from(current);
    setBusy(true);
    try {
      if (listView) {
        const cfg = (listView.config ?? {}) as Record<string, unknown>;
        await updateView.mutateAsync({
          id: listView.id,
          payload: { config: { ...cfg, hiddenStandardColumns } },
        });
      } else {
        await processViewsService.create({
          processId: listId,
          name: 'Lista',
          viewType: 'LIST',
          config: { hiddenStandardColumns },
        });
        qc.invalidateQueries({ queryKey: processViewsKeys.list(listId) });
      }
    } catch {
      toast.error('Erro ao atualizar colunas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
        <Dialog.Content className='shadow-lg fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l bg-background p-0 data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'>
          <header className='flex flex-col gap-1.5 px-6 pb-2 pt-6'>
            <Dialog.Title className='font-semibold text-foreground'>
              Campos
            </Dialog.Title>
            <Dialog.Description className='text-sm text-muted-foreground'>
              Gerencie os campos visíveis como colunas da lista.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type='button'
                aria-label='Fechar'
                className='absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent'
              >
                <X className='h-4 w-4' />
              </button>
            </Dialog.Close>
          </header>

          <div className='flex min-h-0 flex-1 flex-col gap-5 px-6 pb-2'>
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Pesquisar campo'
              className='focus-visible:ring-ring/50 h-9 w-full rounded-md border border-input bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px]'
            />

            <div className='min-h-0 flex-1 overflow-y-auto'>
              {filteredStandard.length > 0 && (
                <div className='mb-6'>
                  <div className='text-xs mb-2 font-semibold uppercase tracking-wide text-muted-foreground'>
                    Campos padrão
                  </div>
                  {filteredStandard.map((col) => {
                    const checked = !hiddenStandardSet.has(col.key);
                    return (
                      <div
                        key={col.key}
                        className='flex items-center justify-between gap-2 py-2 text-foreground'
                      >
                        <span className='text-sm flex-1 truncate'>
                          {col.label}
                        </span>
                        <Switch.Root
                          checked={checked}
                          disabled={busy}
                          onCheckedChange={(next) => {
                            void toggleStandard(col.key, next);
                          }}
                          className={cn(
                            'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
                            'border-2 border-transparent outline-none transition-colors',
                            'data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <Switch.Thumb className='shadow-lg pointer-events-none block h-5 w-5 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0' />
                        </Switch.Root>
                      </div>
                    );
                  })}
                </div>
              )}
              {definitionsQuery.isLoading && (
                <p className='text-paragraph-sm text-muted-foreground'>
                  Carregando…
                </p>
              )}
              {!definitionsQuery.isLoading && groups.length === 0 && (
                <p className='text-paragraph-sm text-muted-foreground'>
                  Nenhum campo personalizado nesta lista.
                </p>
              )}
              {groups.map((group) => (
                <div key={group.key} className='mb-6'>
                  <div className='text-xs mb-2 font-semibold uppercase tracking-wide text-muted-foreground'>
                    {group.label}
                  </div>
                  {group.defs.map((def) => {
                    const checked = visibleIds.has(def.id);
                    return (
                      <div
                        key={def.id}
                        className='flex items-center justify-between gap-2 py-2 text-foreground'
                      >
                        <span className='text-sm flex-1 truncate'>
                          {def.name}
                        </span>
                        <Switch.Root
                          checked={checked}
                          disabled={busy}
                          onCheckedChange={(next) => {
                            void toggle(def.id, next);
                          }}
                          className={cn(
                            'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
                            'border-2 border-transparent outline-none transition-colors',
                            'data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <Switch.Thumb className='shadow-lg pointer-events-none block h-5 w-5 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0' />
                        </Switch.Root>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
