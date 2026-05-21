-- ============================================================================
-- Kommo Foundations — Migration 2/2 (Sprint 2)
-- ----------------------------------------------------------------------------
-- 7 tabelas restantes do PLANO-KOMMO-DASHBOARD: KommoPipeline, KommoStatus,
-- KommoDepartment, KommoAgent, KommoLead, KommoSyncCheckpoint,
-- KommoMetricSnapshot.
--
-- Migration reconstruida em 2026-05-13 via pg_dump do banco local. Arquivo
-- original sumiu do repo entre 2026-04-29 (aplicacao) e 2026-05-13 (auditoria).
-- ============================================================================

-- CreateTable
CREATE TABLE "kommo_pipelines" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kommo_pipeline_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_statuses" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "kommo_status_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_departments" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kommo_department_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_agents" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kommo_user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "department_id" TEXT,
    "mapped_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_leads" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kommo_lead_id" BIGINT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "responsible_agent_id" TEXT,
    "name" TEXT,
    "value_cents" BIGINT,
    "closed_at" TIMESTAMP(3),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_won" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_sync_checkpoints" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "last_cursor" TEXT,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "kommo_sync_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kommo_metric_snapshots" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "pipeline_id" TEXT,
    "metric_key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3),
    "window_end" TIMESTAMP(3),
    "value" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "kommo_pipelines_workspace_id_kommo_pipeline_id_key" ON "kommo_pipelines"("workspace_id", "kommo_pipeline_id");
CREATE INDEX "kommo_pipelines_workspace_id_is_archived_idx" ON "kommo_pipelines"("workspace_id", "is_archived");

CREATE UNIQUE INDEX "kommo_statuses_workspace_id_pipeline_id_kommo_status_id_key" ON "kommo_statuses"("workspace_id", "pipeline_id", "kommo_status_id");
CREATE INDEX "kommo_statuses_workspace_id_pipeline_id_idx" ON "kommo_statuses"("workspace_id", "pipeline_id");

CREATE UNIQUE INDEX "kommo_departments_workspace_id_kommo_department_id_key" ON "kommo_departments"("workspace_id", "kommo_department_id");

CREATE UNIQUE INDEX "kommo_agents_workspace_id_kommo_user_id_key" ON "kommo_agents"("workspace_id", "kommo_user_id");
CREATE INDEX "kommo_agents_workspace_id_department_id_idx" ON "kommo_agents"("workspace_id", "department_id");
CREATE INDEX "kommo_agents_workspace_id_is_active_idx" ON "kommo_agents"("workspace_id", "is_active");

CREATE UNIQUE INDEX "kommo_leads_workspace_id_kommo_lead_id_key" ON "kommo_leads"("workspace_id", "kommo_lead_id");
CREATE INDEX "kommo_leads_workspace_id_pipeline_id_status_id_idx" ON "kommo_leads"("workspace_id", "pipeline_id", "status_id");
CREATE INDEX "kommo_leads_workspace_id_responsible_agent_id_idx" ON "kommo_leads"("workspace_id", "responsible_agent_id");
CREATE INDEX "kommo_leads_workspace_id_created_at_idx" ON "kommo_leads"("workspace_id", "created_at");

CREATE UNIQUE INDEX "kommo_sync_checkpoints_workspace_id_entity_key" ON "kommo_sync_checkpoints"("workspace_id", "entity");
CREATE INDEX "kommo_sync_checkpoints_workspace_id_last_sync_at_idx" ON "kommo_sync_checkpoints"("workspace_id", "last_sync_at");

CREATE UNIQUE INDEX "kommo_metric_snapshots_workspace_id_pipeline_id_metric_key__key" ON "kommo_metric_snapshots"("workspace_id", "pipeline_id", "metric_key", "window_start", "window_end");
CREATE INDEX "kommo_metric_snapshots_workspace_id_metric_key_updated_at_idx" ON "kommo_metric_snapshots"("workspace_id", "metric_key", "updated_at");

-- AddForeignKey
ALTER TABLE "kommo_pipelines" ADD CONSTRAINT "kommo_pipelines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kommo_statuses" ADD CONSTRAINT "kommo_statuses_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "kommo_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kommo_departments" ADD CONSTRAINT "kommo_departments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kommo_agents" ADD CONSTRAINT "kommo_agents_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kommo_agents" ADD CONSTRAINT "kommo_agents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "kommo_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kommo_agents" ADD CONSTRAINT "kommo_agents_mapped_user_id_fkey" FOREIGN KEY ("mapped_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kommo_leads" ADD CONSTRAINT "kommo_leads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kommo_leads" ADD CONSTRAINT "kommo_leads_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "kommo_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kommo_leads" ADD CONSTRAINT "kommo_leads_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "kommo_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kommo_leads" ADD CONSTRAINT "kommo_leads_responsible_agent_id_fkey" FOREIGN KEY ("responsible_agent_id") REFERENCES "kommo_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
