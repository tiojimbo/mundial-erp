-- ============================================================================
-- Attachment Category
-- ----------------------------------------------------------------------------
-- Adiciona coluna `category` opcional em work_item_attachments + indice
-- parcial para filtros por categoria em anexos nao deletados.
--
-- Migration reconstruida em 2026-05-13 via inspecao do schema do banco. Arquivo
-- original sumiu do repo entre 2026-05-06 (aplicacao) e 2026-05-13 (auditoria).
-- ============================================================================

-- AlterTable
ALTER TABLE "work_item_attachments" ADD COLUMN "category" VARCHAR(64);

-- CreateIndex
CREATE INDEX "idx_wi_attachments_task_category" ON "work_item_attachments"("work_item_id", "category") WHERE ("deleted_at" IS NULL);
