import { PartialType } from '@nestjs/swagger';
import { CreateClientClassificationDto } from './create-client-classification.dto';

export class UpdateClientClassificationDto extends PartialType(
  CreateClientClassificationDto,
) {}
