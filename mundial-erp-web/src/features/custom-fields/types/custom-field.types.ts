/**
 * Tipos espelhando os DTOs do backend `mundial-erp-api/src/modules/custom-fields/dtos`.
 *
 * Contrato M1 do PLANO-TASK-TYPES-TEMPLATES (sec. "Interface contratual M1↔M2"),
 * tratado como CONGELADO. Ajustes aqui exigem RFC.
 */

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
  | 'PHONE';

export interface CustomFieldDropdownOption {
  value: string;
  label: string;
}

export interface CustomFieldRequiredWhen {
  field: string;
  equals: string;
}

export interface CustomFieldConfig {
  options?: CustomFieldDropdownOption[];
  min?: number;
  max?: number;
  readOnly?: boolean;
  hint?: string;
  requiredWhen?: CustomFieldRequiredWhen;
  default?: string | number;
}

export interface CustomFieldDefinition {
  id: string;
  /** `null` quando builtin (definicao global). */
  workspaceId: string | null;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  config?: CustomFieldConfig | null;
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Valor escalar despachado pelo `type` da definition.
 *
 * Espelha `CustomFieldValueResponseDto.value` do backend (`string | number |
 * Date | null`). No frontend, recebemos `Date` ja serializado como ISO string.
 */
export type CustomFieldScalarValue = string | number | null;

export interface CustomFieldValue {
  id: string;
  workItemId: string;
  definitionId: string;
  /**
   * Definition embutida no response (backend serializa o join em
   * `CustomFieldValueResponseDto.fromEntity`).
   */
  definition: CustomFieldDefinition;
  value: CustomFieldScalarValue;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldsListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomFieldsListResponse {
  data: CustomFieldDefinition[];
  meta: { pagination: CustomFieldsListPagination };
}

export interface CustomFieldDefinitionsListParams {
  page?: number;
  limit?: number;
  type?: CustomFieldType;
  search?: string;
}

export interface CreateCustomFieldDefinitionPayload {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  config?: CustomFieldConfig;
  sortOrder?: number;
}

export type UpdateCustomFieldDefinitionPayload = Partial<
  Pick<CreateCustomFieldDefinitionPayload, 'label' | 'required' | 'config' | 'sortOrder'>
>;

/** Valor cru aceito pelo PATCH `/tasks/:taskId/custom-fields/:definitionId`. */
export type CustomFieldRawValue = string | number | boolean | Date | null;
