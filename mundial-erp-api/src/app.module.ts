import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { validate } from './config/env.validation';
import { featureFlagsConfig } from './config/feature-flags.config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';
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
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards';
import { WorkspaceGuard } from './modules/workspaces/guards/workspace.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SyncModule } from './modules/sync/sync.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ChatModule } from './modules/chat/chat.module';
import { ViewsModule } from './modules/views/views.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { FavoritesModule } from './modules/favorites/favorites.module';

// Tasks feature (Sprints 1-7) — facade semantica sobre WorkItem.
// Registrar APOS WorkItemsModule para honrar dependencia de providers
// compartilhados (WorkItemsService eh importado por TasksModule).
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskOutboxModule } from './modules/task-outbox/task-outbox.module';
import { CustomTaskTypesModule } from './modules/custom-task-types/custom-task-types.module';
import { TaskTagsModule } from './modules/task-tags/task-tags.module';
import { TaskWatchersModule } from './modules/task-watchers/task-watchers.module';
import { TaskLinksModule } from './modules/task-links/task-links.module';
import { TaskTemplatesModule } from './modules/task-templates/task-templates.module';
import { TaskChecklistsModule } from './modules/task-checklists/task-checklists.module';
import { TaskAttachmentsModule } from './modules/task-attachments/task-attachments.module';
import { TaskCommentsModule } from './modules/task-comments/task-comments.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { TaskActivitiesModule } from './modules/task-activities/task-activities.module';
// Custom Fields (M1 — Sprint 1 TTT-011/TTT-012). Modulo autonomo: nao depende
// de TaskTypeTemplate (M2). Gating via FEATURE_CUSTOM_FIELDS_WRITE_ENABLED
// sera aplicado por TTT-013 (Mariana) com guard transversal proprio.
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
// Task Type Templates (M2 — Sprint 3 TTT-031/TTT-032/TTT-033). Templates 1:1
// com CustomTaskType — read-only nesta release. Gated globalmente via
// FEATURE_TASK_TYPE_TEMPLATES_ENABLED (TaskTypeTemplatesGuard responde 404
// quando OFF). Importado APOS TasksModule porque exporta repository
// consumido por `tasks.service.create` (Felipe — TTT-032). Wiring por
// `forwardRef` nao foi necessario: dependencia e linear (Templates -> Tasks).
import { TaskTypeTemplatesModule } from './modules/task-type-templates/task-type-templates.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { CommonModule } from './common/common.module';

// Kommo integration (Sprint 1).
//   - KommoApiClientModule: HMAC validator + fachada OAuth stub.
//   - KommoAccountsModule (Larissa K1-2 + Rafael K1-6): CRUD KommoAccount,
//     long-lived token (ADR-004), OAuth stubs, envelope encryption ADR-006.
//   - KommoWebhooksModule (Rafael K1-5/K1-8): POST /webhooks/kommo/:workspaceId,
//     HMAC + idempotencia + enqueue BullMQ (ADR-005).
//   - KommoWorkersModule (Mateus K1-7): BullMQ processor + handlers MVP
//     (incoming-chat-message). Wireado na Rodada 6 apos Mateus resolver
//     tokens Symbol inconsistentes e Rafael integrar envelope encryption.
import { KommoApiClientModule } from './modules/kommo-api-client/kommo-api-client.module';
import { KommoAccountsModule } from './modules/kommo-accounts/kommo-accounts.module';
//   - KommoReconciliationModule (Mateus K2-5): cron @5min idempotente +
//     KommoSyncCheckpoint; cobre eventos perdidos pelo webhook.
//   - KommoBackfillModule (Mateus K3-4 parcial): backfill 90d retomavel
//     para KommoConversation; processor BullMQ.
import { KommoReconciliationModule } from './modules/kommo-reconciliation/kommo-reconciliation.module';
import { KommoBackfillModule } from './modules/kommo-backfill/kommo-backfill.module';

@Module({
  imports: [
    // Config with Zod validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [featureFlagsConfig],
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

    // Feature flags transversais (TasksFeatureFlagGuard, etc.)
    FeatureFlagsModule,

    // Common providers (@Global): CycleDetectorService, S3AdapterService, FileTypeDetectorService
    CommonModule,

    // Redis (shared connection)
    RedisModule,

    // BullMQ Queues
    QueueModule,

    // Elasticsearch
    SearchModule,

    // Health checks
    HealthModule,

    // Prometheus metrics — `/metrics` (Bearer auth via METRICS_TOKEN). Sprint 5 TTT-050.
    MetricsModule,

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
    ViewsModule,

    // Work Items (Itens de Processos LIST)
    WorkItemsModule,

    // Notifications (Notificacoes Inbox)
    NotificationsModule,

    // Realtime (gateway Socket.IO /notifications — HPP-135)
    RealtimeModule,

    // Tasks feature (paridade ClickUp — Sprints 1-7). Ordem logica:
    //   1. TaskOutboxModule primeiro (produtor transacional de eventos).
    //   2. CustomTaskTypesModule (dependencia de TasksModule via include).
    //   3. TasksModule (facade principal `/tasks/*`).
    //   4. Sub-recursos: tags, watchers, dependencies, links, templates,
    //      checklists, attachments, comments, activities.
    // Todos sao gated pelo TasksFeatureFlagGuard (per-workspace opt-out).
    TaskOutboxModule,
    CustomTaskTypesModule,
    TasksModule,
    TaskTagsModule,
    TaskWatchersModule,
    TaskLinksModule,
    TaskTemplatesModule,
    TaskChecklistsModule,
    TaskAttachmentsModule,
    TaskCommentsModule,
    TaskActivitiesModule,
    TimeEntriesModule,

    // Custom Fields (M1 — autonomo, M2 TaskTypeTemplate consome a interface).
    CustomFieldsModule,

    // Task Type Templates (M2 — TTT-031). Read-only por enquanto; consumido
    // por `tasks.service.create` para aplicar `defaultDescriptionBlocks`
    // quando feature flag esta ON. Importado apos `CustomFieldsModule`
    // porque referencia `CustomFieldDefinition` via `TaskTypeTemplateField`
    // (somente leitura — sem dependencia de provider).
    TaskTypeTemplatesModule,

    // Automations (HPP — Hoppe-style /ai/automation, substitui motor BPMN)
    AutomationsModule,

    // Workspaces (Multi-tenancy — Squad Workspace F1.4)
    WorkspacesModule,

    // Favorites (Hoppe-style /favorites — por usuario e workspace)
    FavoritesModule,

    // Kommo integration (Squad Kommo — Sprint 1 Etapa 1). Gate global
    // via `KOMMO_SYNC_ENABLED` + `KommoFeatureFlagGuard` (registrado em
    // FeatureFlagsModule). O webhook publico replica a checagem do flag
    // inline no service porque `@Public()` faz o guard global skip.
    //
    // Ordem: ApiClient (puro) → Accounts (Repository compartilhado) →
    // Webhooks (HMAC + enqueue) → Workers (processor + handlers).
    KommoApiClientModule,
    KommoAccountsModule,
    KommoReconciliationModule,
    KommoBackfillModule,
  ],
  providers: [
    // Global guards (order: Throttler → JWT Auth → Workspace → Roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: WorkspaceGuard },
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
