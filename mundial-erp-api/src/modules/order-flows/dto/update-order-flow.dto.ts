import { PartialType } from '@nestjs/swagger';
import { CreateOrderFlowDto } from './create-order-flow.dto';

export class UpdateOrderFlowDto extends PartialType(CreateOrderFlowDto) {}
