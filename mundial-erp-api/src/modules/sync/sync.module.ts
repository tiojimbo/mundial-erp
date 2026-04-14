import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_SYNC } from '../queue/queue.constants';

// Sync internal
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { ProFinancasClientService } from './pro-financas/pro-financas-client.service';
import { SyncLogRepository } from './repositories/sync-log.repository';
import { SyncMappingRepository } from './repositories/sync-mapping.repository';

// External modules (for repository injection)
import { CompaniesModule } from '../companies/companies.module';
import { StatesModule } from '../states/states.module';
import { CitiesModule } from '../cities/cities.module';
import { ClientClassificationsModule } from '../client-classifications/client-classifications.module';
import { DeliveryRoutesModule } from '../delivery-routes/delivery-routes.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { CarriersModule } from '../carriers/carriers.module';
import { OrderTypesModule } from '../order-types/order-types.module';
import { OrderFlowsModule } from '../order-flows/order-flows.module';
import { OrderModelsModule } from '../order-models/order-models.module';
import { ClientsModule } from '../clients/clients.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_SYNC }),
    CompaniesModule,
    StatesModule,
    CitiesModule,
    ClientClassificationsModule,
    DeliveryRoutesModule,
    PaymentMethodsModule,
    CarriersModule,
    OrderTypesModule,
    OrderFlowsModule,
    OrderModelsModule,
    ClientsModule,
    OrdersModule,
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncProcessor,
    ProFinancasClientService,
    SyncLogRepository,
    SyncMappingRepository,
  ],
  exports: [SyncService],
})
export class SyncModule {}
