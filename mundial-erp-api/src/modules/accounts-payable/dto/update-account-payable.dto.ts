import { PartialType } from '@nestjs/swagger';
import { CreateAccountPayableDto } from './create-account-payable.dto';

export class UpdateAccountPayableDto extends PartialType(CreateAccountPayableDto) {}
