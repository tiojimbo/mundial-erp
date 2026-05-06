'use client';

import { useMemo } from 'react';
import { useCustomFieldValues, usePatchCustomFieldValue } from '../hooks/use-custom-field-values';
import { useFeatureFlag } from '../hooks/use-feature-flag';
import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldScalarValue,
  CustomFieldValue,
} from '../types/custom-field.types';
import { CustomFieldEditor } from './custom-field-editor';

/**
 * Sprint 2 (TTT-022) — Secao reutilizavel de custom fields para uma task.
 *
 * Responsabilidades:
 *  1. Carrega valores via `useCustomFieldValues(taskId)` (envia tambem as
 *     `definitions` joinadas pelo backend — nao ha fetch separado).
 *  2. Filtra entradas por `definitionIds?` (template aplicado dita a ordem
 *     de exibicao via PLANO §"M2 → M4"). Sem filtro, exibe todas as
 *     definitions visiveis para a task.
 *  3. Ordena por `definition.sortOrder`.
 *  4. Despacha cada linha pelo `CustomFieldEditor`.
 *  5. Aplica `useFeatureFlag('custom_fields_write')` -> readOnly global.
 *  6. Quando vazio (sem definitions / loading nulo / sem feature flag e sem
 *     dados), retorna `null` para nao quebrar layouts da TaskView.
 *
 * Nao e responsavel por:
 *  - Renderizar header/heading da secao (consumidor decide via
 *    `CollapsibleSection` da Sprint 4 ou heading customizado).
 *  - Validacao Zod no submit — debounce do editor + erro 422 do backend
 *    cobrem o ciclo, e o `usePatchCustomFieldValue` ja toaste no rollback.
 */

export interface CustomFieldsSectionProps {
  taskId: string;
  /**
   * Restringe quais definitions sao renderizadas. Usado quando a task tem
   * template aplicado e queremos exibir apenas os campos do template.
   * `undefined` => exibe todas as definitions joinadas pelo GET.
   */
  definitionIds?: string[];
  /**
   * Override forcado de readOnly. Util para preview no CreateTaskDialog antes
   * da task existir. Default: derivado da feature flag.
   */
  readOnly?: boolean;
  /**
   * Slot opcional para titulo. Quando informado, e renderizado acima do grid;
   * caso contrario o consumidor envolve a secao com seu proprio heading.
   */
  title?: string;
}

export function CustomFieldsSection({
  taskId,
  definitionIds,
  readOnly: readOnlyOverride,
  title,
}: CustomFieldsSectionProps) {
  const writeEnabled = useFeatureFlag('custom_fields_write');
  const { data: values, isLoading, isError } = useCustomFieldValues(taskId);
  const patchMutation = usePatchCustomFieldValue();

  const filtered = useMemo<CustomFieldValue[]>(() => {
    if (!values || values.length === 0) return [];
    const filteredEntries =
      definitionIds && definitionIds.length > 0
        ? values.filter((entry) => definitionIds.includes(entry.definitionId))
        : values;

    return [...filteredEntries].sort(
      (a, b) => a.definition.sortOrder - b.definition.sortOrder,
    );
  }, [values, definitionIds]);

  if (isLoading || isError) {
    return null;
  }

  if (filtered.length === 0) {
    return null;
  }

  const isReadOnly = readOnlyOverride ?? !writeEnabled;

  return (
    <section
      aria-label={title ?? 'Campos personalizados'}
      className="flex flex-col gap-3"
    >
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((entry) => (
          <CustomFieldEditor
            key={entry.definitionId}
            definition={entry.definition}
            value={normalizeScalar(entry)}
            readOnly={isReadOnly}
            onChange={(next: CustomFieldRawValue) => {
              patchMutation.mutate({
                taskId,
                definitionId: entry.definitionId,
                value: next,
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Normaliza o `value` recebido do backend conforme o `type` da definition.
 *
 * O DTO do backend (`CustomFieldValueResponseDto`) ja serializa em
 * `value: string | number | Date | null` mas Date chega como ISO string.
 * Aqui apenas validamos que valores numericos cheguem como `number` e
 * datas como string ISO — protegendo a UI contra inconsistencias do JSON
 * parser.
 */
function normalizeScalar(entry: CustomFieldValue): CustomFieldScalarValue {
  const { value, definition } = entry;
  if (value === null || value === undefined) return null;

  switch (definition.type) {
    case 'NUMBER':
    case 'CURRENCY':
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    case 'DATE':
      // Pode chegar como ISO ou date-only; deixamos a string crua para o
      // DateField recortar em `toDateInput`.
      return typeof value === 'string' ? value : String(value);
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

/** Re-export do tipo para consumidores externos (CreateTaskDialog). */
export type { CustomFieldDefinition };
