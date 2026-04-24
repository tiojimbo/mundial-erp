-- ============================================================================
-- Tasks RLS — Policy aditiva para builtin CustomTaskType (Gap #1 PLANO-TASKS)
-- ----------------------------------------------------------------------------
-- ADITIVA — nao remove policies existentes; apenas adiciona excecao para a
-- linha builtin (workspace_id IS NULL AND is_builtin = true).
--
-- CONTEXTO:
--   A Migration 4 (`20260420_000004_tasks_rls_policies`) criou a policy
--   `ws_isolation_custom_task_types` cujo WITH CHECK exige
--   `workspace_id = current_setting('app.workspace_id', true)::text` — o que
--   bloqueia INSERT/UPDATE da linha builtin (workspace_id NULL). O seed da
--   Sprint 1 contornava via DISABLE/ENABLE RLS momentaneo, o que e inaceitavel
--   em producao. A Migration 5 (`20260420_000005_revert_tasks_rls_policies`)
--   desativou RLS inteiro ate que o `PrismaService` propague o GUC
--   `app.workspace_id`. Quando o RLS for reativado (Sprint pos-hotfix), esta
--   policy adicional ja estara em vigor, permitindo o upsert de builtins sem
--   workaround.
--
-- COMPORTAMENTO RLS:
--   Policies PERMISSIVE sao combinadas com OR. Esta policy adicional eh
--   AVALIADA EM PARALELO a `ws_isolation_custom_task_types`: qualquer linha
--   que case em QUALQUER policy passa. Assim, a linha builtin (workspace_id
--   NULL + is_builtin=true) e aceita sem relaxar isolamento das demais
--   (workspaces isolados continuam respondendo apenas a policy principal).
--
-- APLICA A:
--   SELECT — builtins sao visiveis a todos os workspaces (via OR com a policy
--            principal que ja tem `OR workspace_id IS NULL`).
--   INSERT — caminho novo: seed + eventual backfill de builtins.
--   UPDATE — caminho novo: evolucao controlada de builtins pela propria API
--            de administracao (quando existir).
--   DELETE — deliberadamente OMITIDO: builtins nao devem ser apagados; deixar
--            a policy principal (que bloqueia DELETE sem workspace match) como
--            salvaguarda.
--
-- IDEMPOTENCIA:
--   Postgres 16 NAO suporta `CREATE POLICY IF NOT EXISTS` — seguimos o padrao
--   ja usado em `20260420_000005_revert_tasks_rls_policies`: DROP IF EXISTS
--   seguido de CREATE. Reexecucao e no-op.
--
-- ROLLBACK: `prisma/rollbacks/tasks_rls_custom_types_builtin.down.sql`
--   (DROP POLICY IF EXISTS "ws_isolation_custom_task_types_builtin" ON
--   "custom_task_types"; — nao remove nenhuma policy de outra migration).
-- ============================================================================

DROP POLICY IF EXISTS "ws_isolation_custom_task_types_builtin" ON "custom_task_types";

CREATE POLICY "ws_isolation_custom_task_types_builtin"
  ON "custom_task_types"
  AS PERMISSIVE
  FOR ALL
  USING (
    "workspace_id" IS NULL AND "is_builtin" = true
  )
  WITH CHECK (
    "workspace_id" IS NULL AND "is_builtin" = true
  );

-- ============================================================================
-- Verificacao rapida pos-migrate:
--   SELECT polname, polpermissive, polcmd
--     FROM pg_policy
--    WHERE polrelid = 'custom_task_types'::regclass
--    ORDER BY polname;
-- Esperado (quando Migration 4 estiver tambem aplicada):
--   ws_isolation_custom_task_types          | t | *
--   ws_isolation_custom_task_types_builtin  | t | *
-- ============================================================================
