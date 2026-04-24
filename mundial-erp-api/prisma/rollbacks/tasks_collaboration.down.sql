-- ============================================================================
-- Rollback — tasks_collaboration (Migration 2/3)
-- ----------------------------------------------------------------------------
-- Desfaz 20260419_000002_tasks_collaboration na ordem reversa das operacoes.
-- Executar MANUALMENTE via psql; nao ha migration down automatica em Prisma.
--
-- Ordem:
--   1. Drop FKs (tag_links -> tags; watchers/assignees -> users/work_items; tags -> workspaces).
--   2. Drop indices (unique + hot-path).
--   3. Drop tables (reverse dos creates: tag_links, tags, watchers, assignees).
--
-- Pre-req: se o backfill da Migration 2 ja rodou e populou work_item_assignees,
-- os dados DERIVADOS sao perdidos (primary_assignee_cache na work_items
-- permanece intacto e volta a ser a fonte unica durante o rollback).
--
-- ATENCAO: este rollback DEVE ser executado ANTES de
-- rollbacks/tasks_foundations.down.sql. Ver rollbacks/README.md.
-- ============================================================================

-- 1. DropForeignKey
ALTER TABLE "work_item_tag_links"  DROP CONSTRAINT IF EXISTS "work_item_tag_links_tag_id_fkey";
ALTER TABLE "work_item_tag_links"  DROP CONSTRAINT IF EXISTS "work_item_tag_links_work_item_id_fkey";
ALTER TABLE "work_item_tags"       DROP CONSTRAINT IF EXISTS "work_item_tags_workspace_id_fkey";
ALTER TABLE "work_item_watchers"   DROP CONSTRAINT IF EXISTS "work_item_watchers_user_id_fkey";
ALTER TABLE "work_item_watchers"   DROP CONSTRAINT IF EXISTS "work_item_watchers_work_item_id_fkey";
ALTER TABLE "work_item_assignees"  DROP CONSTRAINT IF EXISTS "work_item_assignees_user_id_fkey";
ALTER TABLE "work_item_assignees"  DROP CONSTRAINT IF EXISTS "work_item_assignees_work_item_id_fkey";

-- 2. DropIndex
DROP INDEX IF EXISTS "idx_wi_tag_links_tag";
DROP INDEX IF EXISTS "idx_wi_tags_ws_deleted";
DROP INDEX IF EXISTS "work_item_tags_workspace_id_name_lower_key";
DROP INDEX IF EXISTS "idx_wi_watchers_user";
DROP INDEX IF EXISTS "idx_wi_assignees_primary";
DROP INDEX IF EXISTS "idx_wi_assignees_user";

-- 3. DropTable (ordem reversa das FK dependencies)
DROP TABLE IF EXISTS "work_item_tag_links";
DROP TABLE IF EXISTS "work_item_tags";
DROP TABLE IF EXISTS "work_item_watchers";
DROP TABLE IF EXISTS "work_item_assignees";
