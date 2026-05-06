'use client';

import { useMemo } from 'react';
import { useCustomTaskTypes } from '@/features/tasks/hooks/use-custom-task-types';
import { useTaskTypeTemplates } from '@/features/tasks/hooks/use-task-type-templates';
import { getIconByName } from '@/features/tasks/components/icon-picker';

/**
 * TTT-044 (Sprint 4) — Listagem read-only de `CustomTaskType` do workspace
 * exibida em `/settings/custom-task-types`. Cada item mostra:
 *
 * - Icone (Lucide via `getIconByName`) tingido com `type.color`
 * - Nome (e descricao secundaria sobre escopo: builtin/workspace)
 * - Badge "Builtin" para tipos compartilhados entre workspaces
 * - Badge "Template" quando o tipo possui template configurado
 *   (cruza `customTaskTypeId` retornado por `GET /task-type-templates`)
 *
 * A11y: `role=list`/`listitem`, `aria-busy` no skeleton e `aria-label`
 * descritivo no badge "Template".
 */
export function CustomTaskTypesList(): JSX.Element {
  const typesQuery = useCustomTaskTypes();
  const templatesQuery = useTaskTypeTemplates();

  const withTemplate = useMemo(() => {
    const ids = new Set<string>();
    for (const template of templatesQuery.data ?? []) {
      ids.add(template.customTaskTypeId);
    }
    return ids;
  }, [templatesQuery.data]);

  if (typesQuery.isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="h-32 animate-pulse rounded-lg bg-bg-weak-50"
      />
    );
  }

  const types = typesQuery.data ?? [];
  if (types.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke-soft-200 p-6 text-center text-paragraph-sm text-text-sub-600">
        Nenhum tipo custom disponivel.
      </div>
    );
  }

  return (
    <ul role="list" className="flex flex-col gap-2">
      {types.map((type) => {
        const Icon = getIconByName(type.icon);
        const hasTemplate = withTemplate.has(type.id);
        return (
          <li
            key={type.id}
            role="listitem"
            className="flex items-center gap-3 rounded-md border border-stroke-soft-200 bg-bg-white-0 p-3"
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
              <Icon className="size-4" aria-hidden />
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
            {hasTemplate && (
              <span
                className="inline-flex h-6 items-center gap-1 rounded-md bg-feature-lighter px-2 text-subheading-2xs text-feature-base"
                aria-label={`${type.name} possui template configurado`}
              >
                Template
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
