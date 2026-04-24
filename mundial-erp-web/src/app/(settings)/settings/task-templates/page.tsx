'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  RiAddLine,
  RiDeleteBin6Line,
  RiEyeLine,
} from '@remixicon/react';
import {
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskTemplates,
} from '@/features/tasks/hooks/use-task-templates';
import type { TaskTemplate } from '@/features/tasks/types/task.types';

/**
 * `/settings/task-templates` — lista + preview payload + CRUD stub (PLANO §12).
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function TaskTemplatesSettingsPage(): JSX.Element {
  const templatesQuery = useTaskTemplates();
  const createTemplate = useCreateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleCreateStub = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Informe um nome para o template.');
      return;
    }
    await createTemplate.mutateAsync({
      name,
      payload: {
        description: '',
        checklists: [],
        assigneeIds: [],
        tagIds: [],
      },
    });
    toast.success('Template criado');
    setNewName('');
  };

  const handleDelete = async (template: TaskTemplate) => {
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(`Excluir o template "${template.name}"?`);
    if (!confirmed) return;
    await deleteTemplate.mutateAsync(template.id);
    toast.success('Template excluido');
  };

  const previewTemplate = templatesQuery.data?.find((t) => t.id === previewId);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">
          Templates de tarefas
        </h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Modelos reutilizaveis para agilizar a criacao de tarefas.
        </p>
      </header>

      <section
        aria-label="Novo template"
        className="flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 md:flex-row md:items-center"
      >
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome do template"
          className="h-9 flex-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm text-text-strong-950 outline-none focus:border-stroke-strong-950"
        />
        <button
          type="button"
          onClick={handleCreateStub}
          disabled={createTemplate.isPending}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary-base px-4 text-label-xs text-static-white hover:bg-primary-darker disabled:opacity-60"
        >
          <RiAddLine className="size-4" aria-hidden />
          Criar stub
        </button>
      </section>

      <section
        aria-label="Lista de templates"
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        <div className="flex flex-col gap-2">
          {templatesQuery.isLoading ? (
            <div
              role="status"
              aria-busy="true"
              aria-live="polite"
              className="h-32 animate-pulse rounded-lg bg-bg-weak-50"
            />
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <ul role="list" className="flex flex-col gap-2">
              {templatesQuery.data.map((template) => (
                <li
                  key={template.id}
                  role="listitem"
                  className="flex items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 p-3"
                >
                  <div className="flex-1">
                    <p className="text-label-sm text-text-strong-950">
                      {template.name}
                    </p>
                    <p className="text-paragraph-xs text-text-sub-600">
                      Atualizado em{' '}
                      {new Date(template.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewId(template.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-stroke-soft-200 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
                    aria-label={`Visualizar payload do template ${template.name}`}
                  >
                    <RiEyeLine className="size-4" aria-hidden />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(template)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-error-base px-3 text-label-xs text-error-base hover:bg-error-lighter"
                    aria-label={`Excluir template ${template.name}`}
                  >
                    <RiDeleteBin6Line className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-stroke-soft-200 p-6 text-center text-paragraph-sm text-text-sub-600">
              Nenhum template cadastrado.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3">
          <header className="mb-2">
            <h2 className="text-label-md text-text-strong-950">Preview</h2>
            <p className="text-paragraph-xs text-text-sub-600">
              Payload JSON do template selecionado.
            </p>
          </header>
          {previewTemplate ? (
            <pre
              className="max-h-96 overflow-auto rounded-md bg-bg-weak-50 p-3 font-mono text-subheading-2xs text-text-strong-950"
              aria-label={`Payload do template ${previewTemplate.name}`}
            >
              {JSON.stringify(previewTemplate.payload, null, 2)}
            </pre>
          ) : (
            <p className="text-paragraph-sm text-text-sub-600">
              Selecione um template para ver o payload.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
