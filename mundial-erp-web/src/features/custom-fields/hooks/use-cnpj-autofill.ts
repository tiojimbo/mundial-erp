'use client';

import { useRef } from 'react';
import { useCnpjLookup } from './use-cnpj-lookup';
import { usePatchCustomFieldValue } from './use-custom-field-values';
import type {
  CnpjAutofillSource,
  CnpjLookupResult,
  CustomFieldDefinition,
  CustomFieldRawValue,
} from '../types/custom-field.types';

const CNPJ_AUTOFILL_MAP: {
  source: CnpjAutofillSource;
  targetDefinitionId: string;
}[] = [
  { source: 'razaoSocial', targetDefinitionId: 'cfd-cnpj-af-razao-social' },
  { source: 'nomeFantasia', targetDefinitionId: 'cfd-cnpj-af-nome-fantasia' },
  { source: 'contato.email', targetDefinitionId: 'cfd-cnpj-af-email' },
  { source: 'contato.telefone', targetDefinitionId: 'cfd-cnpj-af-telefone' },
  { source: 'endereco.cep', targetDefinitionId: 'cfd-cnpj-af-cep' },
  { source: 'endereco.logradouro', targetDefinitionId: 'cfd-cnpj-af-logradouro' },
  { source: 'endereco.numero', targetDefinitionId: 'cfd-cnpj-af-numero' },
  {
    source: 'endereco.complemento',
    targetDefinitionId: 'cfd-cnpj-af-complemento',
  },
  { source: 'endereco.bairro', targetDefinitionId: 'cfd-cnpj-af-bairro' },
  { source: 'endereco.municipio', targetDefinitionId: 'cfd-cnpj-af-municipio' },
  { source: 'endereco.uf', targetDefinitionId: 'cfd-cnpj-af-uf' },
  { source: 'dataAbertura', targetDefinitionId: 'cfd-cnpj-af-data-abertura' },
  { source: 'situacaoCadastral', targetDefinitionId: 'cfd-cnpj-af-situacao' },
  { source: 'naturezaJuridica', targetDefinitionId: 'cfd-cnpj-af-natureza' },
  { source: 'cnaePrincipal.codigo', targetDefinitionId: 'cfd-cnpj-af-cnae-codigo' },
  {
    source: 'cnaePrincipal.descricao',
    targetDefinitionId: 'cfd-cnpj-af-cnae-descricao',
  },
  { source: 'porte', targetDefinitionId: 'cfd-cnpj-af-porte' },
  { source: 'capitalSocial', targetDefinitionId: 'cfd-cnpj-af-capital-social' },
];

export function useCnpjAutofill(taskId: string) {
  const cnpjLookup = useCnpjLookup();
  const patchMutation = usePatchCustomFieldValue();
  const lastLookedUpRef = useRef<string | null>(null);

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
        for (const { source, targetDefinitionId } of CNPJ_AUTOFILL_MAP) {
          const value = readPath(result, source);
          if (value === null || value === undefined) continue;
          patchMutation.mutate({
            taskId,
            customFieldId: targetDefinitionId,
            value: typeof value === 'number' ? value : String(value),
          });
        }
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
