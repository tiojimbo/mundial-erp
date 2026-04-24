-- Adiciona coluna `settings` (JSONB) a `workspaces`, conforme schema.prisma.
-- Bag de configuracoes livres por workspace (feature flags per-workspace como
-- `tasksV2Enabled`). Vide schema.prisma `model Workspace` e PLANO-TASKS.md §9.1.
-- NOT NULL com default '{}' para existing rows receberem payload vazio.

ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}'::jsonb;
