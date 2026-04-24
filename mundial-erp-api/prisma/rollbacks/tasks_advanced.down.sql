-- ============================================================================
-- Rollback — tasks_advanced (Migration 3/3)
-- ----------------------------------------------------------------------------
-- Desfaz 20260419_000003_tasks_advanced na ordem reversa das operacoes.
-- Executar MANUALMENTE via psql; nao ha migration down automatica em Prisma.
--
-- Ordem:
--   1. Drop FKs (cada tabela; inclui self-FK de checklist_items.parent_id).
--   2. Drop indices (unique + hot-path).
--   3. Drop tables na ordem reversa dos creates.
--   4. Drop enums (TaskActivityType, ChecklistItemSource, TaskTemplateScope).
--
-- Perda de dados esperada: TUDO em
--   work_item_activities, work_item_comments, work_item_attachments,
--   work_item_templates, work_item_status_history, work_item_links,
--   work_item_dependencies, work_item_checklist_items, work_item_checklists.
--
-- ATENCAO: este rollback DEVE ser executado ANTES de
--   - rollbacks/tasks_collaboration.down.sql
--   - rollbacks/tasks_foundations.down.sql
-- Ver rollbacks/README.md.
--
-- Pre-req: workers BullMQ de Tasks PAUSADOS antes de rodar (evita insert
-- concorrente em work_item_activities via outbox).
-- ============================================================================

-- 1. DropForeignKey
ALTER TABLE "work_item_activities"      DROP CONSTRAINT IF EXISTS "work_item_activities_actor_id_fkey";
ALTER TABLE "work_item_activities"      DROP CONSTRAINT IF EXISTS "work_item_activities_work_item_id_fkey";

ALTER TABLE "work_item_comments"        DROP CONSTRAINT IF EXISTS "work_item_comments_author_id_fkey";
ALTER TABLE "work_item_comments"        DROP CONSTRAINT IF EXISTS "work_item_comments_work_item_id_fkey";

ALTER TABLE "work_item_attachments"     DROP CONSTRAINT IF EXISTS "work_item_attachments_uploaded_by_fkey";
ALTER TABLE "work_item_attachments"     DROP CONSTRAINT IF EXISTS "work_item_attachments_work_item_id_fkey";

ALTER TABLE "work_item_templates"       DROP CONSTRAINT IF EXISTS "work_item_templates_process_id_fkey";
ALTER TABLE "work_item_templates"       DROP CONSTRAINT IF EXISTS "work_item_templates_department_id_fkey";
ALTER TABLE "work_item_templates"       DROP CONSTRAINT IF EXISTS "work_item_templates_workspace_id_fkey";

ALTER TABLE "work_item_status_history"  DROP CONSTRAINT IF EXISTS "work_item_status_history_status_id_fkey";
ALTER TABLE "work_item_status_history"  DROP CONSTRAINT IF EXISTS "work_item_status_history_work_item_id_fkey";

ALTER TABLE "work_item_links"           DROP CONSTRAINT IF EXISTS "work_item_links_to_task_id_fkey";
ALTER TABLE "work_item_links"           DROP CONSTRAINT IF EXISTS "work_item_links_from_task_id_fkey";

ALTER TABLE "work_item_dependencies"    DROP CONSTRAINT IF EXISTS "work_item_dependencies_to_task_id_fkey";
ALTER TABLE "work_item_dependencies"    DROP CONSTRAINT IF EXISTS "work_item_dependencies_from_task_id_fkey";

ALTER TABLE "work_item_checklist_items" DROP CONSTRAINT IF EXISTS "work_item_checklist_items_assignee_id_fkey";
ALTER TABLE "work_item_checklist_items" DROP CONSTRAINT IF EXISTS "work_item_checklist_items_parent_id_fkey";
ALTER TABLE "work_item_checklist_items" DROP CONSTRAINT IF EXISTS "work_item_checklist_items_checklist_id_fkey";

ALTER TABLE "work_item_checklists"      DROP CONSTRAINT IF EXISTS "work_item_checklists_work_item_id_fkey";

-- 2. DropIndex
DROP INDEX IF EXISTS "idx_wi_activities_task_created";
DROP INDEX IF EXISTS "idx_wi_comments_task_created";
DROP INDEX IF EXISTS "idx_wi_attachments_task";
DROP INDEX IF EXISTS "idx_wi_templates_ws_scope_del";
DROP INDEX IF EXISTS "idx_status_history_task_entered";
DROP INDEX IF EXISTS "idx_wi_links_to";
DROP INDEX IF EXISTS "work_item_links_from_task_id_to_task_id_key";
DROP INDEX IF EXISTS "idx_wi_deps_to";
DROP INDEX IF EXISTS "work_item_dependencies_from_task_id_to_task_id_key";
DROP INDEX IF EXISTS "idx_checklist_items_parent";
DROP INDEX IF EXISTS "idx_checklist_items_list_pos";
DROP INDEX IF EXISTS "idx_checklists_wi_pos";

-- 3. DropTable (ordem reversa das FK dependencies)
DROP TABLE IF EXISTS "work_item_activities";
DROP TABLE IF EXISTS "work_item_comments";
DROP TABLE IF EXISTS "work_item_attachments";
DROP TABLE IF EXISTS "work_item_templates";
DROP TABLE IF EXISTS "work_item_status_history";
DROP TABLE IF EXISTS "work_item_links";
DROP TABLE IF EXISTS "work_item_dependencies";
DROP TABLE IF EXISTS "work_item_checklist_items";
DROP TABLE IF EXISTS "work_item_checklists";

-- 4. DropEnum (em ordem reversa do CREATE TYPE)
DROP TYPE IF EXISTS "TaskActivityType";
DROP TYPE IF EXISTS "ChecklistItemSource";
DROP TYPE IF EXISTS "TaskTemplateScope";
