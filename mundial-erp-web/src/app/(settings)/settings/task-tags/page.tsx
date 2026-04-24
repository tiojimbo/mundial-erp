'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEditLine,
} from '@remixicon/react';
import { useTags } from '@/features/tasks/hooks/use-tags';
import { useCreateTag } from '@/features/tasks/hooks/use-create-tag';
import { useUpdateTag } from '@/features/tasks/hooks/use-update-tag';
import { useDeleteTag } from '@/features/tasks/hooks/use-delete-tag';
import type { TaskTag } from '@/features/tasks/types/task.types';

/**
 * `/settings/task-tags` — CRUD inline de tags (PLANO §12).
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function TaskTagsSettingsPage(): JSX.Element {
  const tagsQuery = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      toast.error('Informe um nome para a tag.');
      return;
    }
    await createTag.mutateAsync({ name: trimmed, color: newColor });
    toast.success('Tag criada');
    setNewName('');
  };

  const handleStartEdit = (tag: TaskTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (trimmed.length === 0) {
      toast.error('Nome nao pode ficar vazio.');
      return;
    }
    await updateTag.mutateAsync({
      tagId: editingId,
      payload: { name: trimmed, color: editColor },
    });
    toast.success('Tag atualizada');
    setEditingId(null);
  };

  const handleDelete = async (tag: TaskTag) => {
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(`Excluir a tag "${tag.name}"?`);
    if (!confirmed) return;
    await deleteTag.mutateAsync(tag.id);
    toast.success('Tag excluida');
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">Tags de tarefas</h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Gerencie as tags compartilhadas do workspace.
        </p>
      </header>

      <section
        aria-label="Criar nova tag"
        className="flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 md:flex-row md:items-center"
      >
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome da tag"
          className="h-9 flex-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm text-text-strong-950 outline-none focus:border-stroke-strong-950"
        />
        <label className="inline-flex items-center gap-2">
          <span className="sr-only">Cor</span>
          <input
            type="color"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            className="size-8 cursor-pointer rounded-md border border-stroke-soft-200 bg-bg-white-0"
          />
        </label>
        <button
          type="button"
          onClick={handleCreate}
          disabled={createTag.isPending}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary-base px-4 text-label-xs text-static-white hover:bg-primary-darker disabled:opacity-60"
        >
          <RiAddLine className="size-4" aria-hidden />
          Adicionar
        </button>
      </section>

      <section aria-label="Lista de tags">
        {tagsQuery.isLoading ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="h-32 animate-pulse rounded-lg bg-bg-weak-50"
          />
        ) : tagsQuery.data && tagsQuery.data.length > 0 ? (
          <ul role="list" className="flex flex-col gap-2">
            {tagsQuery.data.map((tag) => {
              const isEditing = editingId === tag.id;
              return (
                <li
                  key={tag.id}
                  role="listitem"
                  className="flex flex-wrap items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 p-3"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="h-8 flex-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm"
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(event) => setEditColor(event.target.value)}
                        className="size-8 cursor-pointer rounded-md border border-stroke-soft-200"
                        aria-label="Cor"
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={updateTag.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-success-base px-3 text-label-xs text-static-white hover:opacity-90"
                      >
                        <RiCheckLine className="size-4" aria-hidden />
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-stroke-soft-200 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
                      >
                        <RiCloseLine className="size-4" aria-hidden />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-subheading-2xs"
                        style={{
                          backgroundColor: `${tag.color}1A`,
                          color: tag.color,
                        }}
                      >
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tag)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-stroke-soft-200 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
                        aria-label={`Editar tag ${tag.name}`}
                      >
                        <RiEditLine className="size-4" aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-error-base px-3 text-label-xs text-error-base hover:bg-error-lighter"
                        aria-label={`Excluir tag ${tag.name}`}
                      >
                        <RiDeleteBin6Line className="size-4" aria-hidden />
                        Excluir
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-stroke-soft-200 p-6 text-center text-paragraph-sm text-text-sub-600">
            Nenhuma tag criada ainda.
          </div>
        )}
      </section>
    </div>
  );
}
