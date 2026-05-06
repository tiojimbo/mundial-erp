'use client';

import { useMemo } from 'react';
import { Settings2 } from 'lucide-react';

import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/use-custom-field-definitions';
import {
  useCustomFieldValues,
  usePatchCustomFieldValue,
} from '@/features/custom-fields/hooks/use-custom-field-values';
import { useFeatureFlag } from '@/features/custom-fields/hooks/use-feature-flag';
import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldValue,
} from '@/features/custom-fields/types/custom-field.types';
import { CnpjField } from '@/features/custom-fields/components/fields/cnpj-field';
import { CpfField } from '@/features/custom-fields/components/fields/cpf-field';
import { CurrencyField } from '@/features/custom-fields/components/fields/currency-field';
import { DateField } from '@/features/custom-fields/components/fields/date-field';
import { DropdownField } from '@/features/custom-fields/components/fields/dropdown-field';
import { EmailField } from '@/features/custom-fields/components/fields/email-field';
import { NumberField } from '@/features/custom-fields/components/fields/number-field';
import { PhoneField } from '@/features/custom-fields/components/fields/phone-field';
import { TextField } from '@/features/custom-fields/components/fields/text-field';
import { UrlField } from '@/features/custom-fields/components/fields/url-field';

import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';

/**
 * Sprint 4 (TTT-041) — Integracao de Custom Fields na Task View.
 *
 * Contrato de exibicao (PLANO-TASK-TYPES-TEMPLATES §"Integracao Task View"):
 *
 *   - `definitionIds == null`     → secao mostra TODAS definitions visiveis
 *                                    ao workspace (task sem customType ou
 *                                    customType sem template).
 *   - `definitionIds == []`       → secao mostra placeholder vazio (template
 *                                    existe mas nao referencia campos).
 *   - `definitionIds == [...ids]` → ordena/filtra exatamente pelos ids do
 *                                    template, na ordem fornecida.
 *
 * Read-only enquanto a flag `custom_fields_write` (M1) estiver OFF — vide
 * `useFeatureFlag` (TTT-023). O dispatcher repassa `readOnly` para cada
 * editor; nenhum PATCH e disparado.
 *
 * NAO toca em `features/custom-fields/` (modulo de Henrique). Apenas consome
 * hooks/types/components ja exportados por aquele modulo.
 */

export type CustomFieldsSectionProps = {
  taskId: string;
  /**
   * Quando fornecido pelo template do CustomTaskType (TTT-031), restringe os
   * campos exibidos a esses `definitionId`s na ordem indicada. `null`/`undefined`
   * = sem template => exibir todas as definitions do workspace.
   */
  definitionIds?: readonly string[] | null;
};

export function CustomFieldsSection({
  taskId,
  definitionIds,
}: CustomFieldsSectionProps) {
  const writeEnabled = useFeatureFlag('custom_fields_write');

  const definitionsQuery = useCustomFieldDefinitions();
  const valuesQuery = useCustomFieldValues(taskId);
  const patchMutation = usePatchCustomFieldValue();

  const isLoading = definitionsQuery.isLoading || valuesQuery.isLoading;
  const isError = definitionsQuery.isError || valuesQuery.isError;

  const allDefinitions: CustomFieldDefinition[] =
    definitionsQuery.data?.data ?? [];

  const visibleDefinitions = useMemo(() => {
    if (!definitionIds) {
      return [...allDefinitions].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
      );
    }
    if (definitionIds.length === 0) return [];
    const map = new Map(allDefinitions.map((d) => [d.id, d]));
    return definitionIds
      .map((id) => map.get(id))
      .filter((d): d is CustomFieldDefinition => Boolean(d));
  }, [allDefinitions, definitionIds]);

  const valueMap = useMemo(() => {
    const map = new Map<string, CustomFieldValue>();
    for (const entry of valuesQuery.data ?? []) {
      map.set(entry.definitionId, entry);
    }
    return map;
  }, [valuesQuery.data]);

  function handleChange(definitionId: string, next: CustomFieldRawValue) {
    if (!writeEnabled) return;
    patchMutation.mutate({ taskId, definitionId, value: next });
  }

  return (
    <CollapsibleSection
      sectionKey='custom-fields'
      title='Campos personalizados'
      actions={
        <button
          type='button'
          aria-label='Gerenciar campos personalizados desta lista'
          className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted'
        >
          <Settings2 className='h-3.5 w-3.5' />
        </button>
      }
    >
      {isLoading && (
        <div
          aria-busy='true'
          aria-label='Carregando campos personalizados'
          className='flex flex-col gap-2'
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='h-9 w-full animate-pulse rounded-md bg-muted' />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' className='text-[12px] text-destructive'>
          Nao foi possivel carregar os campos personalizados.
        </div>
      )}

      {!isLoading && !isError && visibleDefinitions.length === 0 && (
        <EmptyCardCta label='Criar campo personalizado' />
      )}

      {!isLoading && !isError && visibleDefinitions.length > 0 && (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          {visibleDefinitions.map((definition) => (
            <FieldRow
              key={definition.id}
              definition={definition}
              entry={valueMap.get(definition.id) ?? null}
              readOnly={!writeEnabled}
              onChange={(next) => handleChange(definition.id, next)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

type FieldRowProps = {
  definition: CustomFieldDefinition;
  entry: CustomFieldValue | null;
  readOnly: boolean;
  onChange: (next: CustomFieldRawValue) => void;
};

/**
 * Dispatcher local: roteia para o editor correto conforme `definition.type`.
 *
 * Nao depende de um dispatcher exportado por `features/custom-fields/`
 * (Henrique nao publicou ainda) — usa direto os componentes atomicos
 * `<TextField/>`, `<DropdownField/>`, etc., que ja estao prontos.
 */
function FieldRow({ definition, entry, readOnly, onChange }: FieldRowProps) {
  const value = entry?.value ?? null;

  switch (definition.type) {
    case 'TEXT':
      return (
        <TextField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'NUMBER':
      return (
        <NumberField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'CURRENCY':
      return (
        <CurrencyField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'DATE':
      return (
        <DateField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'DROPDOWN':
      return (
        <DropdownField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'CPF':
      return (
        <CpfField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'CNPJ':
      return (
        <CnpjField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'URL':
      return (
        <UrlField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'EMAIL':
      return (
        <EmailField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    case 'PHONE':
      return (
        <PhoneField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
  }
}
