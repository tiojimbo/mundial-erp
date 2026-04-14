import { PartialType } from '@nestjs/swagger';
import { CreateHandoffDto } from './create-handoff.dto';

export class UpdateHandoffDto extends PartialType(CreateHandoffDto) {}
