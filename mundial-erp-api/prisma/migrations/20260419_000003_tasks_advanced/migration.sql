-- ============================================================================
-- Tasks Advanced — Migration 3/3 (Sprint 3-4)
-- ----------------------------------------------------------------------------
-- Parte 3 da feature Tasks (paridade ClickUp). Escopo: funcionalidades
-- avancadas. Todas as tabelas sao NOVAS; zero alteracoes destrutivas.
--
--   - work_item_checklists         (checklists por task)
--   - work_item_checklist_items    (items nested, source manual/template)
--   - work_item_dependencies       (dep forte: from bloqueia to)
--   - work_item_links              (link leve, sem bloqueio)
--   - work_item_status_history     (time-in-status; 1 linha por transicao)
--   - work_item_templates          (snapshot para instanciacao)
--   - work_item_attachments        (S3/MinIO + ClamAV scan)
--   - work_item_comments           (dedicado; nao reusa ChatChannel)
--   - work_item_activities         (projecao assincrona via outbox)
--
-- Enums introduzidos:
--   - TaskTemplateScope   (WORKSPACE | DEPARTMENT | PROCESS)
--   - ChecklistItemSource (MANUAL | TEMPLATE)
--   - TaskActivityType    (28 valores — ver schema.prisma)
--
-- Principio: additive-only. Nenhuma alteracao em tabelas existentes.
-- Rollback em prisma/rollbacks/tasks_advanced.down.sql.
--
-- Pos-migration, rodar scripts/backfill-tasks-feature.ts para popular
-- work_item_status_history com 1 linha inicial por task existente.
--
-- Ver PLANO-TASKS.md secoes 5.1, 5.3 e 15.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums (CREATE TYPE)
-- ----------------------------------------------------------------------------

-- CreateEnum — TaskTemplateScope
CREATE TYPE "TaskTemplateScope" AS ENUM ('WORKSPACE', 'DEPARTMENT', 'PROCESS');

-- CreateEnum — ChecklistItemSource
CREATE TYPE "ChecklistItemSource" AS ENUM ('MANUAL', 'TEMPLATE');

-- CreateEnum — TaskActivityType
CREATE TYPE "TaskActivityType" AS ENUM (
    'CREATED',
    'RENAMED',
    'DESCRIPTION_CHANGED',
    'STATUS_CHANGED',
    'PRIORITY_CHANGED',
    'DUE_DATE_CHANGED',
    'START_DATE_CHANGED',
    'ASSIGNEE_ADDED',
    'ASSIGNEE_REMOVED',
    'WATCHER_ADDED',
    'WATCHER_REMOVED',
    'TAG_ADDED',
    'TAG_REMOVED',
    'CUSTOM_TYPE_CHANGED',
    'POINTS_CHANGED',
    'ARCHIVED',
    'UNARCHIVED',
    'MERGED_INTO',
    'DEPENDENCY_ADDED',
    'DEPENDENCY_REMOVED',
    'LINK_ADDED',
    'LINK_REMOVED',
    'CHECKLIST_CREATED',
    'CHECKLIST_ITEM_RESOLVED',
    'ATTACHMENT_ADDED',
    'SUBTASK_ADDED',
    'SUBTASK_COMPLETED',
    'COMMENT_ADDED'
);

-- ----------------------------------------------------------------------------
-- work_item_checklists — checklist por task
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_checklists" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_checklists_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_checklist_items — items nested (parent_id auto-referencia)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_checklist_items" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "assignee_id" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "source" "ChecklistItemSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_checklist_items_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_dependencies — dep forte (from bloqueia to)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_dependencies" (
    "id" TEXT NOT NULL,
    "from_task_id" TEXT NOT NULL,
    "to_task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "work_item_dependencies_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_links — link leve (sem bloqueio)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_links" (
    "id" TEXT NOT NULL,
    "from_task_id" TEXT NOT NULL,
    "to_task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "work_item_links_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_status_history — time-in-status (1 linha por transicao)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_status_history" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "by_user_id" TEXT,

    CONSTRAINT "work_item_status_history_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_templates — snapshot para instanciacao recursiva
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "TaskTemplateScope" NOT NULL DEFAULT 'WORKSPACE',
    "department_id" TEXT,
    "process_id" TEXT,
    "payload" JSONB NOT NULL,
    "subtask_count" INTEGER NOT NULL DEFAULT 0,
    "checklist_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_templates_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_attachments — S3/MinIO + ClamAV
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_attachments" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_attachments_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_comments — dedicado (nao reusa ChatChannel); BlockNote JSON opcional
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_comments" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "body_blocks" JSONB,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_item_comments_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- work_item_activities — projecao assincrona (ADR-002 + ADR-003)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "work_item_activities" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "type" "TaskActivityType" NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_activities_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indices
-- ----------------------------------------------------------------------------

-- CreateIndex — work_item_checklists
CREATE INDEX "idx_checklists_wi_pos" ON "work_item_checklists"("work_item_id", "position");

-- CreateIndex — work_item_checklist_items
CREATE INDEX "idx_checklist_items_list_pos" ON "work_item_checklist_items"("checklist_id", "position");
CREATE INDEX "idx_checklist_items_parent" ON "work_item_checklist_items"("parent_id");

-- CreateIndex — work_item_dependencies (unique par + hot-path inverso)
CREATE UNIQUE INDEX "work_item_dependencies_from_task_id_to_task_id_key" ON "work_item_dependencies"("from_task_id", "to_task_id");
CREATE INDEX "idx_wi_deps_to" ON "work_item_dependencies"("to_task_id");

-- CreateIndex — work_item_links (unique par + hot-path inverso)
CREATE UNIQUE INDEX "work_item_links_from_task_id_to_task_id_key" ON "work_item_links"("from_task_id", "to_task_id");
CREATE INDEX "idx_wi_links_to" ON "work_item_links"("to_task_id");

-- CreateIndex — work_item_status_history (historia ordenada desc)
CREATE INDEX "idx_status_history_task_entered" ON "work_item_status_history"("work_item_id", "entered_at" DESC);

-- CreateIndex — work_item_templates
CREATE INDEX "idx_wi_templates_ws_scope_del" ON "work_item_templates"("workspace_id", "scope", "deleted_at");

-- CreateIndex — work_item_attachments
CREATE INDEX "idx_wi_attachments_task" ON "work_item_attachments"("work_item_id", "deleted_at");

-- CreateIndex — work_item_comments (feed desc)
CREATE INDEX "idx_wi_comments_task_created" ON "work_item_comments"("work_item_id", "created_at" DESC);

-- CreateIndex — work_item_activities (feed desc)
CREATE INDEX "idx_wi_activities_task_created" ON "work_item_activities"("work_item_id", "created_at" DESC);

-- ----------------------------------------------------------------------------
-- Foreign Keys
-- ----------------------------------------------------------------------------

-- AddForeignKey — work_item_checklists (CASCADE em work_item)
ALTER TABLE "work_item_checklists" ADD CONSTRAINT "work_item_checklists_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey — work_item_checklist_items
ALTER TABLE "work_item_checklist_items" ADD CONSTRAINT "work_item_checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "work_item_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_checklist_items" ADD CONSTRAINT "work_item_checklist_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_item_checklist_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "work_item_checklist_items" ADD CONSTRAINT "work_item_checklist_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — work_item_dependencies (CASCADE em ambos os lados)
ALTER TABLE "work_item_dependencies" ADD CONSTRAINT "work_item_dependencies_from_task_id_fkey" FOREIGN KEY ("from_task_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_dependencies" ADD CONSTRAINT "work_item_dependencies_to_task_id_fkey" FOREIGN KEY ("to_task_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey — work_item_links (CASCADE em ambos os lados)
ALTER TABLE "work_item_links" ADD CONSTRAINT "work_item_links_from_task_id_fkey" FOREIGN KEY ("from_task_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_links" ADD CONSTRAINT "work_item_links_to_task_id_fkey" FOREIGN KEY ("to_task_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey — work_item_status_history
ALTER TABLE "work_item_status_history" ADD CONSTRAINT "work_item_status_history_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_status_history" ADD CONSTRAINT "work_item_status_history_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "workflow_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_templates
ALTER TABLE "work_item_templates" ADD CONSTRAINT "work_item_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_item_templates" ADD CONSTRAINT "work_item_templates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_templates" ADD CONSTRAINT "work_item_templates_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — work_item_attachments (CASCADE em work_item; RESTRICT em user)
ALTER TABLE "work_item_attachments" ADD CONSTRAINT "work_item_attachments_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_attachments" ADD CONSTRAINT "work_item_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_comments (CASCADE em work_item; RESTRICT em author)
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — work_item_activities (CASCADE em work_item; SET NULL em actor)
ALTER TABLE "work_item_activities" ADD CONSTRAINT "work_item_activities_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_activities" ADD CONSTRAINT "work_item_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
