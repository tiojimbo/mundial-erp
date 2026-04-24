'use client';

import { useCustomTaskTypes } from '@/features/tasks/hooks/use-custom-task-types';

/**
 * `/settings/custom-task-types` — listagem read-only (PLANO §12).
 * Builtin types ficam marcados com badge; workspace custom types aparecem sem badge.
 *
 * NOTE App Router: `export default` obrigatorio (excecao regra #13).
 */
export default function CustomTaskTypesSettingsPage(): JSX.Element {
  const query = useCustomTaskTypes();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-title-h4 text-text-strong-950">
          Tipos custom de tarefa
        </h1>
        <p className="text-paragraph-sm text-text-sub-600">
          Lista read-only de tipos builtin e custom disponiveis no workspace.
        </p>
      </header>

      {query.isLoading ? (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="h-32 animate-pulse rounded-lg bg-bg-weak-50"
        />
      ) : query.data && query.data.length > 0 ? (
        <ul role="list" className="flex flex-col gap-2">
          {query.data.map((type) => (
            <li
              key={type.id}
              role="listitem"
              className="flex items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 p-3"
            >
              <div
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: type.color
                    ? `${type.color}1A`
                    : 'var(--bg-weak-50)',
                  color: type.color ?? 'var(--text-sub-600)',
                }}
              >
                {type.icon?.slice(0, 2).toUpperCase() ?? 'T'}
              </div>
              <div className="flex-1">
                <p className="text-label-sm text-text-strong-950">{type.name}</p>
                <p className="text-paragraph-xs text-text-sub-600">
                  {type.workspaceId
                    ? 'Especifico do workspace'
                    : 'Disponivel globalmente'}
                </p>
              </div>
              {type.isBuiltin && (
                <span className="inline-flex h-6 items-center rounded-md bg-bg-weak-50 px-2 text-subheading-2xs text-text-sub-600">
                  Builtin
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-stroke-soft-200 p-6 text-center text-paragraph-sm text-text-sub-600">
          Nenhum tipo custom disponivel.
        </div>
      )}
    </div>
  );
}
