import { cn } from '@/lib/cn';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

/**
 * Sprint 2 (TTT-021) — Tipos e estilos base compartilhados pelos 10 editores.
 *
 * `BaseFieldProps` define o contrato uniforme que o dispatcher
 * `CustomFieldEditor` repassa. Nenhum editor pode adicionar props extras —
 * isso preservaria a regra de modulo autonomo (consumidores nao precisam
 * saber qual tipo esta dentro).
 *
 * `inputClass` mapeia para o estilo padrao do projeto (mesmo padrao de
 * `task-title.tsx` e `subtask-row.tsx`): borda sutil, focus ring WCAG AA,
 * destaque vermelho quando `aria-invalid`. Reusamos tokens do tailwind.config
 * em vez de cores raw.
 */

export interface BaseFieldProps<T = unknown> {
  definition: CustomFieldDefinition;
  value: T;
  onChange: (next: T) => void;
  readOnly?: boolean;
  error?: string;
}

export const inputClass = cn(
  // base
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground',
  'transition-colors',
  // placeholder
  'placeholder:text-muted-foreground/60',
  // focus
  'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
  // disabled / readonly
  'disabled:cursor-not-allowed disabled:opacity-60',
  'read-only:cursor-default read-only:bg-muted/40',
  // error
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
);
