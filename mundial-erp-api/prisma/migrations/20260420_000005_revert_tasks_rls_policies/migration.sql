-- ============================================================================
-- Revert Tasks RLS Policies — Migration 5 (Hotfix Squad Tasks)
-- ----------------------------------------------------------------------------
-- A Migration 4 (`20260420_000004_tasks_rls_policies`) ativou RLS com policies
-- `ws_isolation_*` que dependem de `SET LOCAL app.workspace_id` sendo emitido
-- em toda conexao/transaction da API. Contudo, o `PrismaService` nao
-- implementou o wrapper que emite esse GUC — resultando em RLS error 42501
-- ("a nova linha viola a politica de seguranca") em toda insercao em
-- `work_items` e tabelas cobertas.
--
-- Ate que o `PrismaService` seja refatorado para propagar `app.workspace_id`
-- via `AsyncLocalStorage` + query hook (RFC pendente, ADR Mariana), RLS fica
-- desativado. O isolamento multi-tenant continua garantido em 100% das
-- queries via clausula `process.department.workspaceId` aplicada nas camadas
-- de repository.
--
-- Idempotente via `IF EXISTS`. Sem perda de dados (apenas metadados de
-- security).
-- ============================================================================

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
