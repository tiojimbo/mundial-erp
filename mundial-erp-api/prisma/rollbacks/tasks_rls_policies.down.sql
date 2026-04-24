-- ============================================================================
-- Rollback: Tasks RLS Policies (Migration 4 — Sprint 8)
-- ----------------------------------------------------------------------------
-- Remove todas as policies `ws_isolation_*` e desativa RLS nas tabelas de
-- Tasks. Idempotente via IF EXISTS.
--
-- Perda de dados: ZERO (apenas metadados de security).
-- Efeito colateral: apos este rollback, qualquer query sem WorkspaceGuard
-- volta a enxergar dados cross-workspace. Reverter apenas se houver
-- incidente de compatibilidade (connection sem SET app.workspace_id).
-- ============================================================================

-- Drop policies (ordem nao importa, mas segue a criacao para facilitar diff).
DROP POLICY IF EXISTS "ws_isolation_work_item_tags"              ON "work_item_tags";
DROP POLICY IF EXISTS "ws_isolation_work_item_templates"         ON "work_item_templates";
DROP POLICY IF EXISTS "ws_isolation_custom_task_types"           ON "custom_task_types";
DROP POLICY IF EXISTS "ws_isolation_work_items"                  ON "work_items";
DROP POLICY IF EXISTS "ws_isolation_work_item_assignees"         ON "work_item_assignees";
DROP POLICY IF EXISTS "ws_isolation_work_item_watchers"          ON "work_item_watchers";
DROP POLICY IF EXISTS "ws_isolation_work_item_tag_links"         ON "work_item_tag_links";
DROP POLICY IF EXISTS "ws_isolation_work_item_checklists"        ON "work_item_checklists";
DROP POLICY IF EXISTS "ws_isolation_work_item_checklist_items"   ON "work_item_checklist_items";
DROP POLICY IF EXISTS "ws_isolation_work_item_dependencies"      ON "work_item_dependencies";
DROP POLICY IF EXISTS "ws_isolation_work_item_links"             ON "work_item_links";
DROP POLICY IF EXISTS "ws_isolation_work_item_status_history"    ON "work_item_status_history";
DROP POLICY IF EXISTS "ws_isolation_work_item_attachments"       ON "work_item_attachments";
DROP POLICY IF EXISTS "ws_isolation_work_item_comments"          ON "work_item_comments";
DROP POLICY IF EXISTS "ws_isolation_work_item_activities"        ON "work_item_activities";
DROP POLICY IF EXISTS "ws_isolation_task_outbox_events"          ON "task_outbox_events";

-- Disable RLS (NO FORCE primeiro para o caso de rollback de owner).
ALTER TABLE "work_items"                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_items"                  NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_assignees"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_assignees"         NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_watchers"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_watchers"          NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_tag_links"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_tag_links"         NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_checklists"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_checklists"        NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_checklist_items"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_checklist_items"   NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_dependencies"      DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_dependencies"      NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_links"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_links"             NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_status_history"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_status_history"    NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_attachments"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_attachments"       NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_comments"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_comments"          NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_activities"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_activities"        NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "task_outbox_events"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "task_outbox_events"          NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_tags"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_tags"              NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_templates"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_templates"         NO FORCE  ROW LEVEL SECURITY;

ALTER TABLE "custom_task_types"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_task_types"           NO FORCE  ROW LEVEL SECURITY;
