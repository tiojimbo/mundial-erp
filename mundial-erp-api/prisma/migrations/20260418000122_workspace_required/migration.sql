-- =============================================================================
-- Migration 3 — workspace_required
--
-- Torna `workspace_id` NOT NULL nas 23 tabelas workspace-scoped e troca as FK
-- de `ON DELETE SET NULL` para `ON DELETE RESTRICT`.
--
-- !!! NAO RODAR ATE QUE O SEED `prisma/seed-workspace.ts` TENHA SIDO EXECUTADO
-- !!! EM TODOS OS AMBIENTES (dev, staging, producao).
--
-- Aplicar manualmente apos a Camila confirmar o seed:
--   npx prisma migrate resolve --rolled-back <prev>   # se necessario
--   npx prisma db execute --file prisma/migrations/20260418000122_workspace_required/migration.sql
--   npx prisma migrate resolve --applied 20260418000122_workspace_required
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Drop FK constraints existentes (criadas com ON DELETE SET NULL)
-- ---------------------------------------------------------------------------
ALTER TABLE "departments"            DROP CONSTRAINT IF EXISTS "departments_workspace_id_fkey";
ALTER TABLE "status_templates"       DROP CONSTRAINT IF EXISTS "status_templates_workspace_id_fkey";
ALTER TABLE "clients"                DROP CONSTRAINT IF EXISTS "clients_workspace_id_fkey";
ALTER TABLE "client_classifications" DROP CONSTRAINT IF EXISTS "client_classifications_workspace_id_fkey";
ALTER TABLE "delivery_routes"        DROP CONSTRAINT IF EXISTS "delivery_routes_workspace_id_fkey";
ALTER TABLE "suppliers"              DROP CONSTRAINT IF EXISTS "suppliers_workspace_id_fkey";
ALTER TABLE "product_types"          DROP CONSTRAINT IF EXISTS "product_types_workspace_id_fkey";
ALTER TABLE "products"               DROP CONSTRAINT IF EXISTS "products_workspace_id_fkey";
ALTER TABLE "unit_measures"          DROP CONSTRAINT IF EXISTS "unit_measures_workspace_id_fkey";
ALTER TABLE "brands"                 DROP CONSTRAINT IF EXISTS "brands_workspace_id_fkey";
ALTER TABLE "product_departments"    DROP CONSTRAINT IF EXISTS "product_departments_workspace_id_fkey";
ALTER TABLE "price_tables"           DROP CONSTRAINT IF EXISTS "price_tables_workspace_id_fkey";
ALTER TABLE "companies"              DROP CONSTRAINT IF EXISTS "companies_workspace_id_fkey";
ALTER TABLE "payment_methods"        DROP CONSTRAINT IF EXISTS "payment_methods_workspace_id_fkey";
ALTER TABLE "carriers"               DROP CONSTRAINT IF EXISTS "carriers_workspace_id_fkey";
ALTER TABLE "dashboards"             DROP CONSTRAINT IF EXISTS "dashboards_workspace_id_fkey";
ALTER TABLE "orders"                 DROP CONSTRAINT IF EXISTS "orders_workspace_id_fkey";
ALTER TABLE "order_types"            DROP CONSTRAINT IF EXISTS "order_types_workspace_id_fkey";
ALTER TABLE "order_flows"            DROP CONSTRAINT IF EXISTS "order_flows_workspace_id_fkey";
ALTER TABLE "order_models"           DROP CONSTRAINT IF EXISTS "order_models_workspace_id_fkey";
ALTER TABLE "financial_categories"   DROP CONSTRAINT IF EXISTS "financial_categories_workspace_id_fkey";
ALTER TABLE "audit_logs"             DROP CONSTRAINT IF EXISTS "audit_logs_workspace_id_fkey";
ALTER TABLE "chat_channels"          DROP CONSTRAINT IF EXISTS "chat_channels_workspace_id_fkey";

-- ---------------------------------------------------------------------------
-- 2) Sanity check — abortar se ainda houver row com workspace_id NULL
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM "departments"            WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "status_templates"       WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "clients"                WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "client_classifications" WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "delivery_routes"        WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "suppliers"              WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "product_types"          WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "products"               WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "unit_measures"          WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "brands"                 WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "product_departments"    WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "price_tables"           WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "companies"              WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "payment_methods"        WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "carriers"               WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "dashboards"             WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "orders"                 WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "order_types"            WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "order_flows"            WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "order_models"           WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "financial_categories"   WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "audit_logs"             WHERE "workspace_id" IS NULL)
    + (SELECT COUNT(*) FROM "chat_channels"          WHERE "workspace_id" IS NULL)
  INTO null_count;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % rows still have workspace_id IS NULL. Run prisma/seed-workspace.ts first.', null_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) ALTER COLUMN workspace_id SET NOT NULL
-- ---------------------------------------------------------------------------
ALTER TABLE "departments"            ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "status_templates"       ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "clients"                ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "client_classifications" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "delivery_routes"        ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "suppliers"              ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "product_types"          ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "products"               ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "unit_measures"          ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "brands"                 ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "product_departments"    ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "price_tables"           ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "companies"              ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "payment_methods"        ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "carriers"               ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "dashboards"             ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "orders"                 ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "order_types"            ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "order_flows"            ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "order_models"           ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "financial_categories"   ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "audit_logs"             ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "chat_channels"          ALTER COLUMN "workspace_id" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) Recriar FK constraints com ON DELETE RESTRICT (workspace nao pode ser
--    deletado enquanto houver dados vinculados — protecao adicional ao soft
--    delete do model Workspace)
-- ---------------------------------------------------------------------------
ALTER TABLE "departments"            ADD CONSTRAINT "departments_workspace_id_fkey"            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "status_templates"       ADD CONSTRAINT "status_templates_workspace_id_fkey"       FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients"                ADD CONSTRAINT "clients_workspace_id_fkey"                FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_classifications" ADD CONSTRAINT "client_classifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_routes"        ADD CONSTRAINT "delivery_routes_workspace_id_fkey"        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers"              ADD CONSTRAINT "suppliers_workspace_id_fkey"              FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_types"          ADD CONSTRAINT "product_types_workspace_id_fkey"          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products"               ADD CONSTRAINT "products_workspace_id_fkey"               FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unit_measures"          ADD CONSTRAINT "unit_measures_workspace_id_fkey"          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brands"                 ADD CONSTRAINT "brands_workspace_id_fkey"                 FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_departments"    ADD CONSTRAINT "product_departments_workspace_id_fkey"    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_tables"           ADD CONSTRAINT "price_tables_workspace_id_fkey"           FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "companies"              ADD CONSTRAINT "companies_workspace_id_fkey"              FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_methods"        ADD CONSTRAINT "payment_methods_workspace_id_fkey"        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carriers"               ADD CONSTRAINT "carriers_workspace_id_fkey"               FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboards"             ADD CONSTRAINT "dashboards_workspace_id_fkey"             FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders"                 ADD CONSTRAINT "orders_workspace_id_fkey"                 FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_types"            ADD CONSTRAINT "order_types_workspace_id_fkey"            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_flows"            ADD CONSTRAINT "order_flows_workspace_id_fkey"            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_models"           ADD CONSTRAINT "order_models_workspace_id_fkey"           FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_categories"   ADD CONSTRAINT "financial_categories_workspace_id_fkey"   FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"             ADD CONSTRAINT "audit_logs_workspace_id_fkey"             FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_channels"          ADD CONSTRAINT "chat_channels_workspace_id_fkey"          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
