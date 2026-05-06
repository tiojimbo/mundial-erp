-- ============================================================================
-- Task Type Templates — Migration aditiva (M2, story TTT-030)
-- ----------------------------------------------------------------------------
-- Plano: .claude/plan/PLANO-TASK-TYPES-TEMPLATES.md §"Modelo de Dados → M2".
-- Framework de templates funcionais 1:1 com CustomTaskType. Define defaults
-- por tipo (categorias de anexo + descricao inicial BlockNote AST) e M:N com
-- CustomFieldDefinition via tabela join task_type_template_fields.
--
-- Cria 2 tabelas:
--   - task_type_templates (1:1 com custom_task_types via FK unique)
--   - task_type_template_fields (M:N entre template e custom_field_definition)
--
-- Zero ALTER em tabelas existentes. Relacoes reversas no Prisma
-- (CustomTaskType.template, CustomFieldDefinition.templateFields) sao
-- puramente modelagem do client; nao geram DDL.
--
-- Indices criados:
--   - UNIQUE task_type_templates(custom_task_type_id) — garante 1:1 estrita
--   - task_type_templates(deleted_at) — filtros de soft delete
--   - task_type_template_fields(template_id, sort_order) — listagem ordenada
--   - PK composta task_type_template_fields(template_id, definition_id)
--
-- Foreign Keys:
--   - task_type_templates.custom_task_type_id → custom_task_types(id)
--     ON DELETE CASCADE: ao deletar o tipo, o template e descartado junto.
--   - task_type_template_fields.template_id → task_type_templates(id)
--     ON DELETE CASCADE: ao deletar o template, vinculos M:N saem juntos.
--   - task_type_template_fields.definition_id → custom_field_definitions(id)
--     ON DELETE RESTRICT: impede deletar definition referenciada por template
--     (forca soft delete na definition; valores e templates ficam orfaos
--     apenas a nivel de UI, nao de FK).
--
-- Rollback: prisma/rollbacks/task_type_templates.down.sql
-- ============================================================================

-- CreateTable
CREATE TABLE "task_type_templates" (
    "id" TEXT NOT NULL,
    "custom_task_type_id" TEXT NOT NULL,
    "attachment_categories" JSONB,
    "default_description_blocks" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_type_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_type_template_fields" (
    "template_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "required_override" BOOLEAN,

    CONSTRAINT "task_type_template_fields_pkey" PRIMARY KEY ("template_id","definition_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_type_templates_custom_task_type_id_key" ON "task_type_templates"("custom_task_type_id");

-- CreateIndex
CREATE INDEX "task_type_templates_deleted_at_idx" ON "task_type_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "task_type_template_fields_template_id_sort_order_idx" ON "task_type_template_fields"("template_id", "sort_order");

-- AddForeignKey
ALTER TABLE "task_type_templates" ADD CONSTRAINT "task_type_templates_custom_task_type_id_fkey" FOREIGN KEY ("custom_task_type_id") REFERENCES "custom_task_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_type_template_fields" ADD CONSTRAINT "task_type_template_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_type_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_type_template_fields" ADD CONSTRAINT "task_type_template_fields_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
