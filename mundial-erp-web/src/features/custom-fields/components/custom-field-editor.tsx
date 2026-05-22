'use client';

import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldScalarValue,
} from '../types/custom-field.types';
import { CheckboxField } from './fields/checkbox-field';
import { CnpjField } from './fields/cnpj-field';
import { CpfField } from './fields/cpf-field';
import { CurrencyField } from './fields/currency-field';
import { DateField } from './fields/date-field';
import { DropdownField } from './fields/dropdown-field';
import { DurationField } from './fields/duration-field';
import { EmailField } from './fields/email-field';
import { LabelField } from './fields/label-field';
import { NumberField } from './fields/number-field';
import { PeopleField } from './fields/people-field';
import { PercentageField } from './fields/percentage-field';
import { PhoneField } from './fields/phone-field';
import { RatingField } from './fields/rating-field';
import { RelationshipField } from './fields/relationship-field';
import { RollupField } from './fields/rollup-field';
import { SelectField } from './fields/select-field';
import { TeamField } from './fields/team-field';
import { TextField } from './fields/text-field';
import { UrlField } from './fields/url-field';
import { UserField } from './fields/user-field';

export interface CustomFieldEditorProps {
  definition: CustomFieldDefinition;
  value: CustomFieldScalarValue;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
}

export function CustomFieldEditor(props: CustomFieldEditorProps) {
  const { definition } = props;

  switch (definition.type) {
    case 'TEXT':
      return <TextField {...castStringProps(props)} />;
    case 'NUMBER':
      return <NumberField {...castNumberProps(props)} />;
    case 'CURRENCY':
      return <CurrencyField {...castNumberProps(props)} />;
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
    case 'SELECT':
      return <SelectField {...castStringProps(props)} />;
    case 'LABEL':
      return <LabelField {...castStringProps(props)} />;
    case 'CHECKBOX':
      return <CheckboxField {...castBooleanProps(props)} />;
    case 'PERCENTAGE':
      return <PercentageField {...castNumberProps(props)} />;
    case 'DURATION':
      return <DurationField {...castNumberProps(props)} />;
    case 'RATING':
      return <RatingField {...castNumberProps(props)} />;
    case 'USER':
      return <UserField {...castStringProps(props)} />;
    case 'TEAM':
      return <TeamField {...castStringProps(props)} />;
    case 'PEOPLE':
      return <PeopleField {...castStringArrayProps(props)} />;
    case 'RELATIONSHIP':
      return <RelationshipField {...castStringArrayProps(props)} />;
    case 'ROLLUP':
      return <RollupField {...castRollupProps(props)} />;
    default:
      return null;
  }
}

function castStringProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: string | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
} {
  const { value } = props;
  const stringValue =
    value === null || value === undefined ? null : String(value);
  return { ...props, value: stringValue };
}

function castNumberProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: number | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
} {
  const { value } = props;
  let numberValue: number | null = null;
  if (typeof value === 'number') numberValue = value;
  else if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    numberValue = Number.isFinite(parsed) ? parsed : null;
  }
  return { ...props, value: numberValue };
}

function castBooleanProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: boolean | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
} {
  const { value } = props;
  let boolValue: boolean | null = null;
  if (typeof value === 'boolean') boolValue = value;
  else if (value === 'true') boolValue = true;
  else if (value === 'false') boolValue = false;
  return { ...props, value: boolValue };
}

function castStringArrayProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: string[] | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
} {
  const { value } = props;
  const arrayValue = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : null;
  return { ...props, value: arrayValue };
}

function castRollupProps(props: CustomFieldEditorProps): {
  definition: CustomFieldDefinition;
  value: string | number | null;
  onChange: (next: CustomFieldRawValue) => void;
  readOnly?: boolean;
  error?: string;
  inline?: boolean;
} {
  const { value } = props;
  if (typeof value === 'number' || typeof value === 'string' || value === null) {
    return { ...props, value };
  }
  return { ...props, value: null };
}
