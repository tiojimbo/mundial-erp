'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as Modal from '@/components/ui/modal';
import { useCustomFieldsManager } from '../../hooks/use-custom-field-definitions';
import { useAddCustomFieldLocation } from '../../hooks/use-custom-field-definitions';
import type { ManagerView } from '../../hooks/use-custom-fields-manager-state';
import type { CustomFieldLocationType } from '../../types/custom-field.types';

interface ManagerAddExistingFieldDialogProps {
  open: boolean;
  onClose: () => void;
  view: ManagerView;
}

function viewLocation(
  view: ManagerView,
): { locationType: CustomFieldLocationType; targetId: string } | null {
  if (view.kind === 'list') {
    return { locationType: 'list', targetId: view.listId };
  }
  if (view.kind === 'folder') {
    return { locationType: 'folder', targetId: view.folderId };
  }
  if (view.kind === 'space') {
    return { locationType: 'space', targetId: view.spaceId };
  }
  return null;
}

export function ManagerAddExistingFieldDialog({
  open,
  onClose,
  view,
}: ManagerAddExistingFieldDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const allQuery = useCustomFieldsManager('all');
  const addLocation = useAddCustomFieldLocation();
  const target = viewLocation(view);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch('');
    }
  }, [open]);

  const fields = useMemo(() => {
    const term = search.trim().toLowerCase();
    const raw = allQuery.data ?? [];
    if (term.length === 0) return raw;
    return raw.filter((f) =>
      [f.name, f.label].join(' ').toLowerCase().includes(term),
    );
  }, [allQuery.data, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleConfirm = async () => {
    if (!target || selected.size === 0) return;
    try {
      await Promise.all(
        Array.from(selected).map((customFieldId) =>
          addLocation.mutateAsync({
            customFieldId,
            targetId: target.targetId,
            locationType: target.locationType,
            action: 'ADD',
          }),
        ),
      );
      toast.success(
        `${selected.size} campo(s) vinculado(s) ao local.`,
      );
      onClose();
    } catch {
      toast.error('Erro ao vincular um ou mais campos.');
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Modal.Content overlayClassName="bg-black/60 backdrop-blur-none">
        <Modal.Header>
          <Modal.Title>Adicionar campo existente</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-3">
          {!target ? (
            <p className="text-paragraph-sm text-muted-foreground">
              Selecione um local (lista, pasta ou departamento) na barra
              lateral para vincular campos existentes.
            </p>
          ) : (
            <>
              <input
                type="search"
                placeholder="Buscar campo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-paragraph-sm"
              />
              <div className="max-h-[320px] overflow-auto rounded-md border">
                {allQuery.isLoading ? (
                  <p className="p-3 text-paragraph-sm text-muted-foreground">
                    Carregando...
                  </p>
                ) : fields.length === 0 ? (
                  <p className="p-3 text-paragraph-sm text-muted-foreground">
                    Nenhum campo encontrado.
                  </p>
                ) : (
                  fields.map((f) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-paragraph-sm last:border-b-0 hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                        className="size-3.5 cursor-pointer rounded-[4px] border"
                      />
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground text-paragraph-xs">
                        {f.type}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-2 text-paragraph-sm hover:bg-muted/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!target || selected.size === 0 || addLocation.isPending}
            className="rounded-md bg-primary-base px-3 py-2 text-paragraph-sm font-medium text-static-white hover:opacity-90 disabled:opacity-50"
          >
            {addLocation.isPending
              ? 'Vinculando...'
              : `Adicionar ${selected.size || ''} campo(s)`}
          </button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
