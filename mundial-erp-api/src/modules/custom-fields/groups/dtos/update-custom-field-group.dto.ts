import { PartialType } from '@nestjs/swagger';
import { CreateCustomFieldGroupDto } from './create-custom-field-group.dto';

export class UpdateCustomFieldGroupDto extends PartialType(
  CreateCustomFieldGroupDto,
) {}
