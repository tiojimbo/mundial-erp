-- Rollback da migration `20260421_000007_tasks_rls_custom_types_builtin`.
-- Remove apenas a policy adicional criada; nao toca `ws_isolation_custom_task_types`
-- (que pertence a Migration 4) nem qualquer outra policy.
-- Idempotente via IF EXISTS.
DROP POLICY IF EXISTS "ws_isolation_custom_task_types_builtin" ON "custom_task_types";
