-- ============================================================================
-- Rollback: 20260425_000011_custom_fields
-- ----------------------------------------------------------------------------
-- Reverte a migration custom_fields (story TTT-010, plano
-- .claude/plan/PLANO-TASK-TYPES-TEMPLATES.md §M1).
--
-- Ordem (importante por dependencias):
--   1. Drop custom_field_values primeiro (FK para custom_field_definitions).
--   2. Drop custom_field_definitions depois (FK para workspaces).
--   3. Drop enum CustomFieldType por ultimo (referenciado pela coluna type
--      em custom_field_definitions, ja removida no passo 2).
--
-- IMPORTANTE: este rollback APAGA todos os valores e definicoes de custom
-- fields persistidos. Se houver dados em producao, exporte antes de aplicar.
-- ============================================================================

-- 1. Tabela de valores (cascade ja cuida de FKs reversas; idempotente).
DROP TABLE IF EXISTS "custom_field_values";

-- 2. Tabela de definicoes.
DROP TABLE IF EXISTS "custom_field_definitions";

-- 3. Enum (so removivel depois que nenhuma coluna o referencie).
DROP TYPE IF EXISTS "CustomFieldType";
