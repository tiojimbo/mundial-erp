-- ============================================================================
-- Rollback: 20260425_000012_task_type_templates
-- ----------------------------------------------------------------------------
-- Reverte a migration task_type_templates (story TTT-030, plano
-- .claude/plan/PLANO-TASK-TYPES-TEMPLATES.md §M2).
--
-- Ordem (importante por dependencias):
--   1. Drop task_type_template_fields primeiro (FK para
--      task_type_templates e custom_field_definitions).
--   2. Drop task_type_templates depois (FK para custom_task_types).
--
-- IMPORTANTE: este rollback APAGA todos os templates e seus vinculos M:N
-- com custom field definitions. Custom_task_types e custom_field_definitions
-- permanecem intactos. Se houver dados em producao, exporte antes de aplicar.
-- ============================================================================

-- 1. Tabela join M:N (depende das duas pontas; deve sair primeiro).
DROP TABLE IF EXISTS "task_type_template_fields";

-- 2. Tabela de templates (1:1 com custom_task_types via FK unique).
DROP TABLE IF EXISTS "task_type_templates";
