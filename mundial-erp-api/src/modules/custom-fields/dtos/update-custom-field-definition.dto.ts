import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCustomFieldDefinitionDto } from './create-custom-field-definition.dto';

export class UpdateCustomFieldDefinitionDto extends PartialType(
  OmitType(CreateCustomFieldDefinitionDto, ['key', 'type'] as const),
) {}
