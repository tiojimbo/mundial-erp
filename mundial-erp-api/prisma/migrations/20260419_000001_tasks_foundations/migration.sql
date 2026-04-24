-- ============================================================================
-- Tasks Foundations — Migration 1/3 (Sprint 1)
-- ----------------------------------------------------------------------------
-- Parte 1 da feature Tasks (paridade ClickUp). Escopo estrito: extensoes
-- nullable em work_items, rename assignee_id -> primary_assignee_cache
-- (ADR-001), novos models CustomTaskType e TaskOutboxEvent (ADR-003).
--
-- Principio: additive-only + rename sem perda de dados. Rollback em
-- prisma/rollbacks/tasks_foundations.down.sql.
--
-- Migracoes 2/3 (tasks_collaboration) e 3/3 (tasks_advanced) virao depois.
-- ============================================================================

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');

-- ----------------------------------------------------------------------------
-- work_items: rename assignee_id -> primary_assignee_cache
-- ----------------------------------------------------------------------------
-- Postgres preserva dados no RENAME COLUMN; o indice composto
-- idx_work_items_assignee_status e a FK work_items_assignee_id_fkey
-- precisam ser recriados apontando para a nova coluna.

-- DropForeignKey
ALTER TABLE "work_items" DROP CONSTRAINT "work_items_assignee_id_fkey";

-- DropIndex
DROP INDEX "idx_work_items_assignee_status";

-- RenameColumn
ALTER TABLE "work_items" RENAME COLUMN "assignee_id" TO "primary_assignee_cache";

-- ----------------------------------------------------------------------------
-- work_items: novas colunas nullable (additive-only — CTO note #1)
-- ----------------------------------------------------------------------------

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN "markdown_content" TEXT;
ALTER TABLE "work_items" ADD COLUMN "points" DECIMAL(10,2);
ALTER TABLE "work_items" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "work_items" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "work_items" ADD COLUMN "custom_type_id" TEXT;
ALTER TABLE "work_items" ADD COLUMN "merged_into_id" TEXT;
ALTER TABLE "work_items" ADD COLUMN "time_spent_seconds" INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- custom_task_types
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "custom_task_types" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "name" TEXT NOT NULL,
    "name_plural" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "avatar_url" TEXT,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "custom_task_types_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- task_outbox_events
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "task_outbox_events" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "task_outbox_events_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indices
-- ----------------------------------------------------------------------------

-- CreateIndex — recreate indice renomeado (apontando para nova coluna)
CREATE INDEX "idx_work_items_assignee_status" ON "work_items"("primary_assignee_cache", "status_id");

-- CreateIndex — novos hot-path
CREATE INDEX "idx_work_items_assignee_due" ON "work_items"("primary_assignee_cache", "due_date");
CREATE INDEX "idx_work_items_archived_process" ON "work_items"("archived", "process_id", "deleted_at");
CREATE INDEX "idx_work_items_custom_type" ON "work_items"("custom_type_id");
CREATE INDEX "idx_work_items_merged_into" ON "work_items"("merged_into_id");

-- CreateIndex — custom_task_types
CREATE INDEX "idx_custom_task_types_ws_deleted" ON "custom_task_types"("workspace_id", "deleted_at");

-- CreateIndex — task_outbox_events
CREATE INDEX "idx_outbox_status_created" ON "task_outbox_events"("status", "created_at");
CREATE INDEX "idx_outbox_aggregate" ON "task_outbox_events"("aggregate_id");

-- ----------------------------------------------------------------------------
-- Foreign Keys
-- ----------------------------------------------------------------------------

-- AddForeignKey — recreate FK renomeada
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_primary_assignee_cache_fkey" FOREIGN KEY ("primary_assignee_cache") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — custom_type_id (SET NULL preserva a task se o tipo for deletado)
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_custom_type_id_fkey" FOREIGN KEY ("custom_type_id") REFERENCES "custom_task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — merged_into_id self-ref (SET NULL se o target for deletado)
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — custom_task_types.workspace_id (builtins com NULL)
ALTER TABLE "custom_task_types" ADD CONSTRAINT "custom_task_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
