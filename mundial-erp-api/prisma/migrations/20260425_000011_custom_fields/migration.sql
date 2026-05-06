-- ============================================================================
-- Custom Fields — Migration aditiva (M1, story TTT-010)
-- ----------------------------------------------------------------------------
-- Plano: .claude/plan/PLANO-TASK-TYPES-TEMPLATES.md §"Modelo de Dados → M1".
-- Modulo autonomo de campos personalizados tipados associados a WorkItems.
-- Cria 1 enum (CustomFieldType) + 2 tabelas (custom_field_definitions,
-- custom_field_values). Zero ALTER em tabelas existentes — apenas FKs
-- referenciando workspaces e work_items. Relacoes reversas no Prisma
-- (Workspace.customFieldDefinitions, WorkItem.customFieldValues) sao puramente
-- modelagem do client; nao geram DDL.
--
-- Indices criados:
--   - custom_field_definitions(workspace_id, deleted_at)
--   - UNIQUE custom_field_definitions(workspace_id, key)
--   - UNIQUE custom_field_values(work_item_id, definition_id)
--   - custom_field_values(work_item_id)
--
-- Rollback: prisma/rollbacks/custom_fields.down.sql
-- ============================================================================

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'DROPDOWN', 'CPF', 'CNPJ', 'URL', 'EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(18,4),
    "value_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_field_definitions_workspace_id_deleted_at_idx" ON "custom_field_definitions"("workspace_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_workspace_id_key_key" ON "custom_field_definitions"("workspace_id", "key");

-- CreateIndex
CREATE INDEX "custom_field_values_work_item_id_idx" ON "custom_field_values"("work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_work_item_id_definition_id_key" ON "custom_field_values"("work_item_id", "definition_id");

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
