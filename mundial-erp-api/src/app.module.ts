import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './modules/queue/queue.module';
import { SearchModule } from './modules/search/search.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BpmModule } from './modules/bpm/bpm.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ProductTypesModule } from './modules/product-types/product-types.module';
import { StatesModule } from './modules/states/states.module';
import { CitiesModule } from './modules/cities/cities.module';
import { NeighborhoodsModule } from './modules/neighborhoods/neighborhoods.module';
import { CarriersModule } from './modules/carriers/carriers.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { ClientClassificationsModule } from './modules/client-classifications/client-classifications.module';
import { DeliveryRoutesModule } from './modules/delivery-routes/delivery-routes.module';
import { OrderTypesModule } from './modules/order-types/order-types.module';
import { OrderFlowsModule } from './modules/order-flows/order-flows.module';
import { OrderModelsModule } from './modules/order-models/order-models.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UnitMeasuresModule } from './modules/unit-measures/unit-measures.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductDepartmentsModule } from './modules/product-departments/product-departments.module';
import { ProductsModule } from './modules/products/products.module';
import { PriceTablesModule } from './modules/price-tables/price-tables.module';
import { ProductionFormulasModule } from './modules/production-formulas/production-formulas.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductionOrdersModule } from './modules/production-orders/production-orders.module';
import { SeparationOrdersModule } from './modules/separation-orders/separation-orders.module';
import { StockRequisitionsModule } from './modules/stock-requisitions/stock-requisitions.module';
import { FinancialCategoriesModule } from './modules/financial-categories/financial-categories.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { FinancialSummaryModule } from './modules/financial-summary/financial-summary.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JwtAuthGuard } from './modules/auth/guards';
import { RolesGuard } from './modules/auth/guards';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SyncModule } from './modules/sync/sync.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ChatModule } from './modules/chat/chat.module';
import { ProcessViewsModule } from './modules/process-views/process-views.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Config with Zod validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Database (Prisma)
    DatabaseModule,

    // Redis (shared connection)
    RedisModule,

    // BullMQ Queues
    QueueModule,

    // Elasticsearch
    SearchModule,

    // Health checks
    HealthModule,

    // Event Emitter (for BPM engine)
    EventEmitterModule.forRoot(),

    // Auth & Users
    AuthModule,
    UsersModule,

    // BPM (Motor de Processos)
    BpmModule,

    // Companies (Empresas)
    CompaniesModule,

    // Product Types (Tipos de Produto)
    ProductTypesModule,

    // Geographic Reference Data
    StatesModule,
    CitiesModule,
    NeighborhoodsModule,

    // Reference Data (Dados de Referência)
    CarriersModule,
    PaymentMethodsModule,
    ClientClassificationsModule,
    DeliveryRoutesModule,
    OrderTypesModule,
    OrderFlowsModule,
    OrderModelsModule,

    // Clients (Clientes)
    ClientsModule,

    // Suppliers (Fornecedores)
    SuppliersModule,

    // Products (Catálogo de Produtos — Squad Products F4B)
    UnitMeasuresModule,
    BrandsModule,
    ProductDepartmentsModule,
    ProductsModule,
    PriceTablesModule,
    ProductionFormulasModule,

    // Orders (Pedidos — Squad Orders F4B — módulo central)
    OrdersModule,

    // Production & Separation (Squad Production F4C)
    ProductionOrdersModule,
    SeparationOrdersModule,

    // Stock Requisitions (Requisicoes de Estoque — Squad Requisitions F4C)
    StockRequisitionsModule,

    // Financial Categories (Categorias Financeiras)
    FinancialCategoriesModule,

    // Accounts Payable (Contas a Pagar — Squad Financeiro)
    AccountsPayableModule,

    // Accounts Receivable (Contas a Receber — Squad Financeiro)
    AccountsReceivableModule,

    // Cash Registers (Caixas — Squad Financeiro)
    CashRegistersModule,

    // Invoices / NF-e (Notas Fiscais — Squad Financeiro)
    InvoicesModule,

    // Financial Summary (Dashboard Financeiro — Squad Financeiro)
    FinancialSummaryModule,

    // Dashboards / Painéis (Squad Dashboards F4C)
    DashboardsModule,

    // Reports / Relatórios (Squad Reports F4C — DRE, vendas, fluxo de caixa)
    ReportsModule,

    // Sync — Integração Pro Finanças (Squad Sync PF — F5)
    SyncModule,

    // Audit Log (F8-3 — rastreabilidade de mutações)
    AuditLogModule,

    // Chat (Comunicacao Interna)
    ChatModule,

    // Process Views (Visualizações por Processo)
    ProcessViewsModule,

    // Work Items (Itens de Processos LIST)
    WorkItemsModule,

    // Notifications (Notificacoes Inbox)
    NotificationsModule,
  ],
  providers: [
    // Global guards (order: Throttler → JWT Auth → Roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global interceptors (order matters: RequestId first)
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    // Audit interceptor (logs all mutations — after response)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },

    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
