import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryRouteDto } from './create-delivery-route.dto';

export class UpdateDeliveryRouteDto extends PartialType(CreateDeliveryRouteDto) {}
