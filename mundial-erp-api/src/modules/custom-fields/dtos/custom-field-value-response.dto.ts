import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  Prisma,
} from '@prisma/client';
import { CustomFieldDefinitionResponseDto } from './custom-field-definition-response.dto';

/**
 * Shape minimo aceito pelo factory (tolerante a queries do repository
 * que selecionam `definition` via include).
 */
export type CustomFieldValueWithDefinition = CustomFieldValue & {
  definition: CustomFieldDefinition;
};

/**
 * Response DTO para `CustomFieldValue` joinado com a definition.
 *
 * Apresentamos apenas a coluna de valor relevante para o tipo da definition,
 * em campo unico `value` (string|number|Date|null), para simplificar o consumo
 * no frontend. Frontend ainda recebe a definition completa (para tipo, label,
 * required, config) e pode formatar adequadamente.
 */
export class CustomFieldValueResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  customFieldId!: string;

  @ApiProperty({ type: () => CustomFieldDefinitionResponseDto })
  customField!: CustomFieldDefinitionResponseDto;

  @ApiPropertyOptional({
    description:
      'Valor escalar dispatcheado pelo type da definition: string|number|Date|null.',
  })
  value!: string | number | Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    entity: CustomFieldValueWithDefinition,
    options: { exposeWorkspaceId: boolean } = { exposeWorkspaceId: true },
  ): CustomFieldValueResponseDto {
    const dto = new CustomFieldValueResponseDto();
    dto.id = entity.id;
    dto.taskId = entity.workItemId;
    dto.customFieldId = entity.definitionId;
    dto.customField = CustomFieldDefinitionResponseDto.fromEntity(
      entity.definition,
      options,
    );
    dto.value = pickScalarValue(entity);
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

function pickScalarValue(
  entity: CustomFieldValueWithDefinition,
): string | number | Date | null {
  if (entity.valueDate !== null) return entity.valueDate;
  if (entity.valueNumber !== null) {
    return decimalToNumber(entity.valueNumber);
  }
  if (entity.valueText !== null) return entity.valueText;
  return null;
}

function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  // Prisma.Decimal expoe `.toNumber()`. Fallback para String() se nao for o caso.
  const decimalLike = value as { toNumber?: () => number };
  return typeof decimalLike.toNumber === 'function'
    ? decimalLike.toNumber()
    : Number(String(value));
}
