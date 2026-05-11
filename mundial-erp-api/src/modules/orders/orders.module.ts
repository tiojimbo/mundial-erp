import { Module } from '@nestjs/common';
import { BpmModule } from '../bpm/bpm.module';

// Core
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

// Listeners (side-effects desacoplados via EventEmitter2)
import { OrderFaturarListener } from './listeners/order-faturar.listener';
import { OrderFaturadoListener } from './listeners/order-faturado.listener';
import { OrderProduzirListener } from './listeners/order-produzir.listener';
import { ProductionCompletedListener } from './listeners/production-completed.listener';
import { OrderEntregueListener } from './listeners/order-entregue.listener';
import { OrderCanceladoListener } from './listeners/order-cancelado.listener';
import { SearchIndexListener } from './listeners/search-index.listener';

// PDF Services
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { LabelPdfService } from './pdf/label-pdf.service';
import { ProductionOrderPdfService } from './pdf/production-order-pdf.service';

@Module({
  imports: [BpmModule],
  controllers: [OrdersController],
  providers: [
    // Core
    OrdersRepository,
    OrdersService,
    // Listeners (1 por transicao — PLANO 3.4)
    OrderFaturarListener,
    OrderFaturadoListener,
    OrderProduzirListener,
    ProductionCompletedListener,
    OrderEntregueListener,
    OrderCanceladoListener,
    SearchIndexListener,
    // PDF
    ProposalPdfService,
    LabelPdfService,
    ProductionOrderPdfService,
  ],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
