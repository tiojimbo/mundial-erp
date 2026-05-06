'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

/**
 * Sprint 2 (TTT-021) — Shell compartilhado por todos os 10 editores.
 *
 * Encapsula a estrutura `<label htmlFor> + control + erro inline` exigida pela
 * AC (a11y completa: `aria-invalid`, `aria-describedby`, focus visivel, role
 * alert). Mantem cada editor atomico e focado em mascara/parsing — sem repetir
 * boilerplate de a11y em 10 arquivos.
 *
 * Tokens (`--destructive`, `text-destructive`, `text-foreground`,
 * `text-muted-foreground`) sao os mesmos usados pelos componentes de
 * `features/tasks/components/task-view/` para consistencia visual.
 */

export interface FieldShellProps {
  definition: CustomFieldDefinition;
  error?: string;
  hint?: string;
  children: (controlProps: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
  /**
   * Quando `true`, renderiza o label visualmente — usado para casos onde o
   * editor precisa de label proprio (ex.: dropdown). Em contexto de
   * `CustomFieldsSection`, o label vem da section e este flag fica `false`
   * para evitar duplicacao de heading.
   */
  showLabel?: boolean;
}

export function fieldId(definition: CustomFieldDefinition): string {
  return `cf-${definition.id}`;
}

export function fieldErrorId(definition: CustomFieldDefinition): string {
  return `${fieldId(definition)}-error`;
}

export function fieldHintId(definition: CustomFieldDefinition): string {
  return `${fieldId(definition)}-hint`;
}

export function FieldShell({
  definition,
  error,
  hint,
  children,
  showLabel = true,
}: FieldShellProps) {
  const id = fieldId(definition);
  const errorId = fieldErrorId(definition);
  const hintId = fieldHintId(definition);

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      {showLabel ? (
        <label
          htmlFor={id}
          className={cn(
            'text-xs font-medium text-muted-foreground',
            error && 'text-destructive',
          )}
        >
          {definition.label}
          {definition.required ? (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy.length > 0 ? describedBy : undefined,
      })}
      {hint ? (
        <span id={hintId} className="text-[11px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-[11px] font-medium text-destructive"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
