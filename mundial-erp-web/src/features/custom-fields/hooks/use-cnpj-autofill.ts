'use client';

import { useMemo, useRef } from 'react';
import { useCnpjLookup } from './use-cnpj-lookup';
import { useBulkPatchCustomFieldValues } from './use-custom-field-values';
import { useCustomFieldDefinitions } from './use-custom-field-definitions';
import type {
  CnpjAutofillSource,
  CnpjLookupResult,
  CustomFieldDefinition,
  CustomFieldRawValue,
} from '../types/custom-field.types';

const CNPJ_AUTOFILL_SOURCES: readonly CnpjAutofillSource[] = [
  'razaoSocial',
  'nomeFantasia',
  'contato.email',
  'contato.telefone',
  'endereco.cep',
  'endereco.logradouro',
  'endereco.numero',
  'endereco.complemento',
  'endereco.bairro',
  'endereco.municipio',
  'endereco.uf',
  'dataAbertura',
  'situacaoCadastral',
  'naturezaJuridica',
  'cnaePrincipal.codigo',
  'cnaePrincipal.descricao',
  'porte',
  'capitalSocial',
] as const;

export function useCnpjAutofill(taskId: string) {
  const cnpjLookup = useCnpjLookup();
  const bulkPatch = useBulkPatchCustomFieldValues();
  const { data: defs } = useCustomFieldDefinitions();
  const lastLookedUpRef = useRef<string | null>(null);

  const sourceToDefinitionId = useMemo(() => {
    const map = new Map<string, string>();
    if (!defs) return map;
    const all = [
      ...defs.workspace,
      ...defs.list,
      ...defs.folder,
      ...defs.space,
      ...defs.taskType,
    ];
    for (const def of all) {
      if (def.autofillSource) map.set(def.autofillSource, def.id);
    }
    return map;
  }, [defs]);

  return function trigger(
    definition: CustomFieldDefinition,
    rawValue: CustomFieldRawValue,
  ) {
    if (definition.type !== 'CNPJ') return;
    const digits = String(rawValue ?? '').replace(/\D/g, '');
    if (digits.length !== 14) return;
    if (lastLookedUpRef.current === digits) return;
    lastLookedUpRef.current = digits;

    cnpjLookup.mutate(digits, {
      onSuccess: (result) => {
        const values: { definitionId: string; value: string | number }[] = [];
        for (const source of CNPJ_AUTOFILL_SOURCES) {
          const definitionId = sourceToDefinitionId.get(source);
          if (!definitionId) continue;
          const value = readPath(result, source);
          if (value === null || value === undefined) continue;
          values.push({
            definitionId,
            value: typeof value === 'number' ? value : String(value),
          });
        }
        if (values.length > 0) bulkPatch.mutate({ taskId, values });
      },
    });
  };
}

function readPath(obj: CnpjLookupResult, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}
