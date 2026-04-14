import { PartialType } from '@nestjs/swagger';
import { CreateOrderTypeDto } from './create-order-type.dto';

export class UpdateOrderTypeDto extends PartialType(CreateOrderTypeDto) {}
