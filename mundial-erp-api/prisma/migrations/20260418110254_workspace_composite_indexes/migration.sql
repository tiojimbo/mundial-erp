-- ============================================================================
-- Workspace Composite Indexes (Recomendacao CTO #5)
-- ----------------------------------------------------------------------------
-- Adiciona indices compostos (workspace_id, deleted_at) nas tabelas de
-- dominio workspace-scoped. As queries dominantes do sistema filtram por
-- workspace_id E deleted_at simultaneamente; sem composto, Postgres usa o
-- indice simples de workspace_id e filtra deleted_at em memoria — desperdica
-- I/O e cresce linearmente com o tamanho do tenant.
--
-- Adiciona tambem (workspace_id, created_at) em audit_logs e
-- (process_id, deleted_at, parent_id) em work_items — vide schema.
--
-- ATENCAO PRODUCAO: este SQL usa CREATE INDEX (BLOQUEANTE). Em prod sob
-- carga, RECRIE manualmente cada index com CREATE INDEX CONCURRENTLY (Prisma
-- nao suporta CONCURRENTLY no migrate diff). Exemplo:
--   DROP INDEX IF EXISTS idx_orders_ws_deleted;
--   CREATE INDEX CONCURRENTLY idx_orders_ws_deleted ON orders(workspace_id, deleted_at);
-- ============================================================================

-- CreateIndex
CREATE INDEX "idx_audit_logs_ws_created" ON "audit_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_brands_ws_deleted" ON "brands"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_carriers_ws_deleted" ON "carriers"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_chat_channels_ws_deleted" ON "chat_channels"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_client_classifications_ws_deleted" ON "client_classifications"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_clients_ws_deleted" ON "clients"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_companies_ws_deleted" ON "companies"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_dashboards_ws_deleted" ON "dashboards"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_delivery_routes_ws_deleted" ON "delivery_routes"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_departments_ws_deleted" ON "departments"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_financial_categories_ws_deleted" ON "financial_categories"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_order_flows_ws_deleted" ON "order_flows"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_order_models_ws_deleted" ON "order_models"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_order_types_ws_deleted" ON "order_types"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_orders_ws_deleted" ON "orders"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_payment_methods_ws_deleted" ON "payment_methods"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_price_tables_ws_deleted" ON "price_tables"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_product_departments_ws_deleted" ON "product_departments"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_product_types_ws_deleted" ON "product_types"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_products_ws_deleted" ON "products"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_suppliers_ws_deleted" ON "suppliers"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_unit_measures_ws_deleted" ON "unit_measures"("workspace_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_workitems_process_deleted_parent" ON "work_items"("process_id", "deleted_at", "parent_id");

-- CreateIndex
CREATE INDEX "idx_workspaces_deleted" ON "workspaces"("deleted_at");

