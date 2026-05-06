'use client';

import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldScalarValue,
} from '../types/custom-field.types';
import { CnpjField } from './fields/cnpj-field';
import { CpfField } from './fields/cpf-field';
import { CurrencyField } from './fields/currency-field';
import { DateField } from './fields/date-field';
import { DropdownField } from './fields/dropdown-field';
import { EmailField } from './fields/email-field';
import { NumberField } from './fields/number-field';
import { PhoneField } from './fields/phone-field';
import { TextField } from './fields/text-field';
import { UrlField } from './fields/url-field';

/**
 * Sprint 2 (TTT-021) — Dispatcher de editor por `definition.type`.
 *
 * Recebe contrato uniforme `BaseFieldProps` e despacha para o editor
 * tipado correspondente. Mantem o consumidor (CustomFieldsSection,
 * futuro CreateTaskDialog) ignorante do tipo concreto — basta passar
 * `definition` + `value` + `onChange`.
 *
 * Tipos invalidos / desconhecidos caem em `null` (defensivo). Isso
 * evita explodir a UI se um seed novo do backend chegar antes do FE
 * conhecer o tipo (deploy-out-of-order).
 */

export interface CustomFieldEditorProps {
  definition: CustomFieldDefinition;
  value: CustomFieldScalarValue;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
}

export function CustomFieldEditor(props: CustomFieldEditorProps) {
  const { definition } = props;

  switch (definition.type) {
    case 'TEXT':
      return <TextField {...props} />;
    case 'NUMBER':
      return <NumberField {...props} />;
    case 'CURRENCY':
      return <CurrencyField {...props} />;
    case 'DATE':
      return <DateField {...castStringProps(props)} />;
    case 'DROPDOWN':
      return <DropdownField {...castStringProps(props)} />;
    case 'CPF':
      return <CpfField {...castStringProps(props)} />;
    case 'CNPJ':
      return <CnpjField {...castStringProps(props)} />;
    case 'URL':
      return <UrlField {...castStringProps(props)} />;
    case 'EMAIL':
      return <EmailField {...castStringProps(props)} />;
    case 'PHONE':
      return <PhoneField {...castStringProps(props)} />;
    default:
      return null;
  }
}

/**
 * Editores que so trabalham com string (DATE/DROPDOWN/CPF/CNPJ/URL/EMAIL/PHONE)
 * recebem o value normalizado para `string | null` — converte numeros para
 * string se houver inconsistencia entre tipo de coluna e tipo declarado.
 */
function castStringProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: string | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
} {
  const { value } = props;
  const stringValue =
    value === null || value === undefined ? null : String(value);
  return { ...props, value: stringValue };
}
