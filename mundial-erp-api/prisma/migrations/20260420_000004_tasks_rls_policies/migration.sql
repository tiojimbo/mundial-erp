-- ============================================================================
-- Tasks RLS Policies — Migration 4 (Sprint 8)
-- ----------------------------------------------------------------------------
-- Defense-in-depth via Postgres Row Level Security. O isolamento primario
-- continua sendo responsabilidade do `WorkspaceGuard` + repositorios com
-- `workspace_id`/derivado via `process.department.workspace_id`. Este RLS
-- e SAFETY NET: uma query que escape dos scopes aplicacao-nivel (ex: raw SQL,
-- bug de DI, cross-tenant via id conhecido) sera bloqueada pelo banco.
--
-- GATE:
--   Toda conexao autenticada precisa executar `SET LOCAL app.workspace_id`
--   ANTES de qualquer query para tabelas de Tasks. O `WorkspaceGuard` ja
--   popula `request.user.workspaceId`; o `PrismaService.$transaction` wrapper
--   deve emitir `SET LOCAL app.workspace_id = $1` no inicio.
--
-- BYPASS ROLE:
--   A role `postgres` (ou a role do migrator/backup) recebe `BYPASSRLS`.
--   Workers BullMQ precisam setar `app.workspace_id` por job (aggregate →
--   workspace lookup) OU rodar com role BYPASSRLS dedicada. Ver §9.2 do PLANO.
--
-- TABELAS COBERTAS (16):
--   Diretas (possuem `workspace_id`):
--     - work_item_tags
--     - work_item_templates
--     - custom_task_types                 (workspace_id NULL = builtin global)
--   Derivadas via WorkItem (process.department.workspace_id):
--     - work_items
--     - work_item_assignees
--     - work_item_watchers
--     - work_item_tag_links
--     - work_item_checklists
--     - work_item_checklist_items         (via checklist → work_item)
--     - work_item_dependencies
--     - work_item_links
--     - work_item_status_history
--     - work_item_attachments
--     - work_item_comments
--     - work_item_activities
--   Derivadas via aggregate (outbox):
--     - task_outbox_events                (aggregate_id = work_item_id)
--
-- POLICY NAMING: `ws_isolation_<table>`.
-- POLICY TYPE: PERMISSIVE default, aplicada a SELECT/INSERT/UPDATE/DELETE.
-- Rollback: prisma/rollbacks/tasks_rls_policies.down.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Parte 1 — ENABLE RLS em todas as tabelas de Tasks.
-- FORCE garante que ate o owner da tabela respeita as policies (exceto roles
-- com BYPASSRLS).
-- ---------------------------------------------------------------------------
ALTER TABLE "work_items"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_items"                  FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_assignees"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_assignees"         FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_watchers"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_watchers"          FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_tag_links"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_tag_links"         FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_checklists"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_checklists"        FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_checklist_items"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_checklist_items"   FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_dependencies"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_dependencies"      FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_links"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_links"             FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_status_history"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_status_history"    FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_attachments"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_attachments"       FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_comments"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_comments"          FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_activities"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_activities"        FORCE  ROW LEVEL SECURITY;

ALTER TABLE "task_outbox_events"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_outbox_events"          FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_tags"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_tags"              FORCE  ROW LEVEL SECURITY;

ALTER TABLE "work_item_templates"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_item_templates"         FORCE  ROW LEVEL SECURITY;

ALTER TABLE "custom_task_types"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_task_types"           FORCE  ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Parte 2 — Policies: tabelas com workspace_id DIRETO.
-- `custom_task_types` aceita workspace_id NULL (builtins globais visiveis
-- para todos os workspaces).
-- ---------------------------------------------------------------------------

CREATE POLICY "ws_isolation_work_item_tags"
  ON "work_item_tags"
  USING (
    "workspace_id" = current_setting('app.workspace_id', true)::text
  )
  WITH CHECK (
    "workspace_id" = current_setting('app.workspace_id', true)::text
  );

CREATE POLICY "ws_isolation_work_item_templates"
  ON "work_item_templates"
  USING (
    "workspace_id" = current_setting('app.workspace_id', true)::text
  )
  WITH CHECK (
    "workspace_id" = current_setting('app.workspace_id', true)::text
  );

CREATE POLICY "ws_isolation_custom_task_types"
  ON "custom_task_types"
  USING (
    "workspace_id" = current_setting('app.workspace_id', true)::text
    OR "workspace_id" IS NULL
  )
  WITH CHECK (
    "workspace_id" = current_setting('app.workspace_id', true)::text
  );


-- ---------------------------------------------------------------------------
-- Parte 3 — Policy para work_items: derivado via process → department.
-- Subquery em UNA direcao (IN) mantem o planner feliz e respeita o indice
-- composto idx_departments_ws_deleted.
-- ---------------------------------------------------------------------------

CREATE POLICY "ws_isolation_work_items"
  ON "work_items"
  USING (
    "process_id" IN (
      SELECT p."id" FROM "processes" p
      WHERE p."department_id" IN (
        SELECT d."id" FROM "departments" d
        WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
      )
    )
  )
  WITH CHECK (
    "process_id" IN (
      SELECT p."id" FROM "processes" p
      WHERE p."department_id" IN (
        SELECT d."id" FROM "departments" d
        WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
      )
    )
  );


-- ---------------------------------------------------------------------------
-- Parte 4 — Policies para tabelas filhas de work_items (tem coluna
-- work_item_id). Usam o mesmo pivot: work_item_id IN (SELECT id FROM
-- work_items WHERE <process → department → workspace>).
-- ---------------------------------------------------------------------------

CREATE POLICY "ws_isolation_work_item_assignees"
  ON "work_item_assignees"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_watchers"
  ON "work_item_watchers"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_tag_links"
  ON "work_item_tag_links"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_checklists"
  ON "work_item_checklists"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

-- work_item_checklist_items NAO tem work_item_id direto: navega via
-- checklist_id → work_item_checklists.work_item_id.
CREATE POLICY "ws_isolation_work_item_checklist_items"
  ON "work_item_checklist_items"
  USING (
    "checklist_id" IN (
      SELECT c."id" FROM "work_item_checklists" c
      WHERE c."work_item_id" IN (
        SELECT w."id" FROM "work_items" w
        WHERE w."process_id" IN (
          SELECT p."id" FROM "processes" p
          WHERE p."department_id" IN (
            SELECT d."id" FROM "departments" d
            WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
          )
        )
      )
    )
  )
  WITH CHECK (
    "checklist_id" IN (
      SELECT c."id" FROM "work_item_checklists" c
      WHERE c."work_item_id" IN (
        SELECT w."id" FROM "work_items" w
        WHERE w."process_id" IN (
          SELECT p."id" FROM "processes" p
          WHERE p."department_id" IN (
            SELECT d."id" FROM "departments" d
            WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
          )
        )
      )
    )
  );

-- work_item_dependencies: from_task_id e to_task_id pertencem ao mesmo
-- workspace (garantido pelo service). Usamos from_task_id como pivot.
CREATE POLICY "ws_isolation_work_item_dependencies"
  ON "work_item_dependencies"
  USING (
    "from_task_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "from_task_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_links"
  ON "work_item_links"
  USING (
    "from_task_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "from_task_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_status_history"
  ON "work_item_status_history"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_attachments"
  ON "work_item_attachments"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_comments"
  ON "work_item_comments"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

CREATE POLICY "ws_isolation_work_item_activities"
  ON "work_item_activities"
  USING (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "work_item_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- Parte 5 — Policy para task_outbox_events.
-- `aggregate_id` aponta para work_items.id na grande maioria dos eventos
-- (ADR-003). Outros aggregate kinds ficam filtrados (invisiveis) para um
-- workspace que nao possua o aggregate — safe default.
-- ---------------------------------------------------------------------------

CREATE POLICY "ws_isolation_task_outbox_events"
  ON "task_outbox_events"
  USING (
    "aggregate_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  )
  WITH CHECK (
    "aggregate_id" IN (
      SELECT w."id" FROM "work_items" w
      WHERE w."process_id" IN (
        SELECT p."id" FROM "processes" p
        WHERE p."department_id" IN (
          SELECT d."id" FROM "departments" d
          WHERE d."workspace_id" = current_setting('app.workspace_id', true)::text
        )
      )
    )
  );

-- ============================================================================
-- Fim da migration 4 — Tasks RLS Policies.
-- Verificacao rapida pos-migrate:
--   SELECT schemaname, tablename, rowsecurity, forcerowsecurity
--     FROM pg_tables WHERE tablename LIKE 'work_item%'
--        OR tablename IN ('custom_task_types','task_outbox_events');
--   SELECT polname, polrelid::regclass FROM pg_policy
--     WHERE polname LIKE 'ws_isolation_%' ORDER BY polrelid::text;
-- ============================================================================
