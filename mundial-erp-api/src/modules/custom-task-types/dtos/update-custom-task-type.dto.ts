import { PartialType } from '@nestjs/swagger';
import { CreateCustomTaskTypeDto } from './create-custom-task-type.dto';

export class UpdateCustomTaskTypeDto extends PartialType(
  CreateCustomTaskTypeDto,
) {}
