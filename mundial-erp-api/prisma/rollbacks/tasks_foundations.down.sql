-- ============================================================================
-- Rollback — tasks_foundations (Migration 1/3)
-- ----------------------------------------------------------------------------
-- Desfaz 20260419_000001_tasks_foundations na ordem reversa das operacoes.
-- Executar MANUALMENTE via psql; nao ha migration down automatica em Prisma.
--
-- Ordem:
--   1. Drop FKs (work_items.custom_type_id, work_items.merged_into_id,
--      custom_task_types.workspace_id, work_items.primary_assignee_cache).
--   2. Drop indices (hot-path + meta).
--   3. Drop tables novas (task_outbox_events, custom_task_types).
--   4. Drop colunas novas em work_items.
--   5. Rename primary_assignee_cache -> assignee_id.
--   6. Recriar indice e FK originais.
--   7. Drop enum OutboxEventStatus.
--
-- Pre-req: script de extension primary-assignee-cache DESABILITADO antes de
-- rodar; caso contrario o trigger pode reagir ao drop de tabelas de Sprint 2.
-- ============================================================================

-- 1. DropForeignKey
ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_custom_type_id_fkey";
ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_merged_into_id_fkey";
ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_primary_assignee_cache_fkey";
ALTER TABLE "custom_task_types" DROP CONSTRAINT IF EXISTS "custom_task_types_workspace_id_fkey";

-- 2. DropIndex
DROP INDEX IF EXISTS "idx_outbox_aggregate";
DROP INDEX IF EXISTS "idx_outbox_status_created";
DROP INDEX IF EXISTS "idx_custom_task_types_ws_deleted";
DROP INDEX IF EXISTS "idx_work_items_merged_into";
DROP INDEX IF EXISTS "idx_work_items_custom_type";
DROP INDEX IF EXISTS "idx_work_items_archived_process";
DROP INDEX IF EXISTS "idx_work_items_assignee_due";
DROP INDEX IF EXISTS "idx_work_items_assignee_status";

-- 3. DropTable
DROP TABLE IF EXISTS "task_outbox_events";
DROP TABLE IF EXISTS "custom_task_types";

-- 4. Drop colunas novas em work_items (ordem inversa das ADD COLUMN)
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "time_spent_seconds";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "merged_into_id";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "custom_type_id";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "archived_at";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "archived";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "points";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "markdown_content";

-- 5. Rename primary_assignee_cache -> assignee_id
ALTER TABLE "work_items" RENAME COLUMN "primary_assignee_cache" TO "assignee_id";

-- 6. Recriar indice e FK originais (nomes identicos aos pre-migration)
CREATE INDEX "idx_work_items_assignee_status" ON "work_items"("assignee_id", "status_id");
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. DropEnum
DROP TYPE IF EXISTS "OutboxEventStatus";
