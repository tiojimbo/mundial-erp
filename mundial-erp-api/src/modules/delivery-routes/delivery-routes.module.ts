import { Module } from '@nestjs/common';
import { DeliveryRoutesController } from './delivery-routes.controller';
import { DeliveryRoutesService } from './delivery-routes.service';
import { DeliveryRoutesRepository } from './delivery-routes.repository';

@Module({
  controllers: [DeliveryRoutesController],
  providers: [DeliveryRoutesService, DeliveryRoutesRepository],
  exports: [DeliveryRoutesService, DeliveryRoutesRepository],
})
export class DeliveryRoutesModule {}
