export type CustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'DATE'
  | 'DROPDOWN'
  | 'CPF'
  | 'CNPJ'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'QUANTITY'
  | 'SELECT'
  | 'CHECKBOX'
  | 'PERCENTAGE'
  | 'DURATION'
  | 'RATING'
  | 'USER'
  | 'TEAM'
  | 'PEOPLE'
  | 'RELATIONSHIP'
  | 'ROLLUP'
  | 'LABEL';

export interface CustomFieldDropdownOption {
  value: string;
  label: string;
}

export type QuantityUnit = 'METER2' | 'UNIT' | 'KG' | 'TON';

export const QUANTITY_UNIT_ABBR: Record<QuantityUnit, string> = {
  METER2: 'm²',
  UNIT: 'un',
  KG: 'kg',
  TON: 't',
};

export const QUANTITY_UNIT_LABEL: Record<QuantityUnit, string> = {
  METER2: 'Metro quadrado',
  UNIT: 'Unidade',
  KG: 'Quilograma',
  TON: 'Tonelada',
};

export interface CustomFieldRequiredWhen {
  field: string;
  equals: string;
}

export type CnpjAutofillSource =
  | 'razaoSocial'
  | 'nomeFantasia'
  | 'situacaoCadastral'
  | 'dataAbertura'
  | 'cnaePrincipal.codigo'
  | 'cnaePrincipal.descricao'
  | 'naturezaJuridica'
  | 'porte'
  | 'capitalSocial'
  | 'endereco.logradouro'
  | 'endereco.numero'
  | 'endereco.complemento'
  | 'endereco.bairro'
  | 'endereco.cep'
  | 'endereco.municipio'
  | 'endereco.codigoMunicipio'
  | 'endereco.uf'
  | 'contato.telefone'
  | 'contato.email';

export interface CustomFieldConfig {
  options?: CustomFieldDropdownOption[];
  min?: number;
  max?: number;
  maxStars?: number;
  taskTypeId?: string;
  readOnly?: boolean;
  hint?: string;
  requiredWhen?: CustomFieldRequiredWhen;
  default?: string | number;
  currency?: string;
  includeTime?: boolean;
  multiple?: boolean;
  cnpjAutofill?: boolean;
  unit?: QuantityUnit;
}

export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataAbertura: string | null;
  cnaePrincipal: { codigo: string; descricao: string } | null;
  cnaesSecundarios: { codigo: string; descricao: string }[];
  naturezaJuridica: string | null;
  porte: string | null;
  capitalSocial: number | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
    municipio: string | null;
    codigoMunicipio: string | null;
    uf: string | null;
  };
  contato: { telefone: string | null; email: string | null };
  fonte: string;
  consultadoEm: string;
}

export interface CustomFieldCreator {
  id: string;
  name: string;
  email: string;
}

export interface CustomFieldGroupEmbed {
  id: string;
  name: string;
  position: number;
  color: string | null;
}

export type CustomFieldLocationType = 'list' | 'folder' | 'space';

export interface CustomFieldLocationLink {
  id: string;
  customFieldId: string;
  listId?: string;
  folderId?: string;
  spaceId?: string;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddCustomFieldLocationPayload {
  customFieldId: string;
  targetId: string;
  locationType: CustomFieldLocationType;
  action: 'ADD' | 'MOVE';
}

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string | null;
  name: string;
  label: string;
  description: string | null;
  type: CustomFieldType;
  required: boolean;
  options: unknown[];
  config: CustomFieldConfig | null;
  defaultValue: unknown;
  validation: Record<string, unknown> | null;
  pinned: boolean;
  visibleToGuests: boolean;
  fillMethod: string;
  autofillSource: string | null;
  fixed: boolean;
  position: number;
  spaceId: string | null;
  folderId: string | null;
  listId: string | null;
  taskTypeId: string | null;
  createdById: string | null;
  creator: CustomFieldCreator | null;
  groupId: string | null;
  groupName: string | null;
  groupPosition: number | null;
  groupColor: string | null;
  group: CustomFieldGroupEmbed | null;
  createdAt: string;
  updatedAt: string;
  lists?: CustomFieldLocationLink[];
  folders?: CustomFieldLocationLink[];
  spaces?: CustomFieldLocationLink[];
}

export type CustomFieldScalarValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export interface CustomFieldValue {
  id: string;
  taskId: string;
  customFieldId: string;
  customField: CustomFieldDefinition;
  value: CustomFieldScalarValue;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldsGroupedResponse {
  workspace: CustomFieldDefinition[];
  list: CustomFieldDefinition[];
  folder: CustomFieldDefinition[];
  space: CustomFieldDefinition[];
  taskType: CustomFieldDefinition[];
}

export interface CustomFieldDefinitionsScope {
  spaceId?: string;
  folderId?: string;
  listId?: string;
  taskTypeId?: string;
}

export type ManagerScope =
  | 'all'
  | 'workspace'
  | 'taskType'
  | 'list'
  | 'folder'
  | 'space';

export interface ManagerCustomFieldLocation {
  type: 'list' | 'folder' | 'space';
  id: string;
}

export interface ManagerCustomFieldTaskType {
  id: string;
  name: string;
}

export type ManagerCustomFieldGroup = CustomFieldGroupEmbed;

export interface ManagerCustomFieldItem extends CustomFieldDefinition {
  locations: ManagerCustomFieldLocation[];
  taskTypes: ManagerCustomFieldTaskType[];
  usageCount: number;
}

export interface CreateCustomFieldDefinitionPayload {
  name: string;
  key?: string;
  label?: string;
  description?: string;
  type: CustomFieldType;
  required?: boolean;
  options?: unknown[];
  config?: CustomFieldConfig;
  defaultValue?: unknown;
  validation?: Record<string, unknown>;
  pinned?: boolean;
  visibleToGuests?: boolean;
  fillMethod?: string;
  position?: number;
  spaceId?: string;
  folderId?: string;
  listId?: string;
  taskTypeId?: string;
  groupId?: string;
  groupName?: string;
  groupPosition?: number;
  groupColor?: string;
}

export type UpdateCustomFieldDefinitionPayload = Partial<
  Omit<CreateCustomFieldDefinitionPayload, 'key' | 'type'>
>;

export type CustomFieldRawValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | Record<string, unknown>
  | null;
