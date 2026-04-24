-- ============================================================================
-- Tasks Collaboration — Migration 2/3 (Sprint 2)
-- ----------------------------------------------------------------------------
-- Parte 2 da feature Tasks (paridade ClickUp). Escopo: colaboracao
--   - work_item_assignees  (multi-assignee; fonte unica; ADR-001)
--   - work_item_watchers   (followers de task)
--   - work_item_tags       (tag por workspace; case-insensitive unique)
--   - work_item_tag_links  (join WorkItem <-> WorkItemTag)
--
-- Principio: additive-only. Nenhuma alteracao em tabelas existentes.
-- Rollback em prisma/rollbacks/tasks_collaboration.down.sql.
--
-- Pos-migration, rodar scripts/backfill-tasks-feature.ts para popular
-- work_item_assignees a partir de work_items.primary_assignee_cache.
--
-- Migration 3/3 (tasks_advanced) cobrira checklists, dependencies, links,
-- templates, attachments, comments, activities e status_history.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- work_item_assignees — multi-assignee (fonte unica)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_assignees" (
    "work_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "work_item_assignees_pkey" PRIMARY KEY ("work_item_id", "user_id")
);

-- ----------------------------------------------------------------------------
-- work_item_watchers — followers
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_watchers" (
    "work_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_watchers_pkey" PRIMARY KEY ("work_item_id", "user_id")
);

-- ----------------------------------------------------------------------------
-- work_item_tags — tag por workspace (case-insensitive unique via name_lower)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_tags" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_lower" TEXT NOT NULL,
    "color" TEXT,
    "bg_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_tags_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_tag_links — join WorkItem <-> WorkItemTag
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_tag_links" (
    "work_item_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "work_item_tag_links_pkey" PRIMARY KEY ("work_item_id", "tag_id")
);

-- ----------------------------------------------------------------------------
-- Indices
-- ----------------------------------------------------------------------------

-- CreateIndex — work_item_assignees
CREATE INDEX "idx_wi_assignees_user" ON "work_item_assignees"("user_id", "work_item_id");
CREATE INDEX "idx_wi_assignees_primary" ON "work_item_assignees"("work_item_id", "is_primary");

-- CreateIndex — work_item_watchers
CREATE INDEX "idx_wi_watchers_user" ON "work_item_watchers"("user_id");

-- CreateIndex — work_item_tags (unique case-insensitive + soft-delete listing)
CREATE UNIQUE INDEX "work_item_tags_workspace_id_name_lower_key" ON "work_item_tags"("workspace_id", "name_lower");
CREATE INDEX "idx_wi_tags_ws_deleted" ON "work_item_tags"("workspace_id", "deleted_at");

-- CreateIndex — work_item_tag_links
CREATE INDEX "idx_wi_tag_links_tag" ON "work_item_tag_links"("tag_id");

-- ----------------------------------------------------------------------------
-- Foreign Keys
-- ----------------------------------------------------------------------------

-- AddForeignKey — work_item_assignees (CASCADE no work_item; RESTRICT implicito no user)
ALTER TABLE "work_item_assignees" ADD CONSTRAINT "work_item_assignees_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_assignees" ADD CONSTRAINT "work_item_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_watchers
ALTER TABLE "work_item_watchers" ADD CONSTRAINT "work_item_watchers_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_watchers" ADD CONSTRAINT "work_item_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_tags.workspace_id
ALTER TABLE "work_item_tags" ADD CONSTRAINT "work_item_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_tag_links (CASCADE em ambos os lados)
ALTER TABLE "work_item_tag_links" ADD CONSTRAINT "work_item_tag_links_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_tag_links" ADD CONSTRAINT "work_item_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "work_item_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
