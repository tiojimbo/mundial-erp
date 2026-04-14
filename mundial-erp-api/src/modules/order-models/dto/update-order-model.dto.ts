import { PartialType } from '@nestjs/swagger';
import { CreateOrderModelDto } from './create-order-model.dto';

export class UpdateOrderModelDto extends PartialType(CreateOrderModelDto) {}
