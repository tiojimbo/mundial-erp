import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCustomFieldDefinitionDto } from './create-custom-field-definition.dto';

/**
 * `key` e `type` sao imutaveis apos a criacao — alterar quebraria valores
 * persistidos em `CustomFieldValue`. Por isso sao removidos do DTO de update.
 */
export class UpdateCustomFieldDefinitionDto extends PartialType(
  OmitType(CreateCustomFieldDefinitionDto, ['key', 'type'] as const),
) {}
