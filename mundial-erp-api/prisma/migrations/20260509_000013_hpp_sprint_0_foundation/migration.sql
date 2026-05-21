CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "MemberPermission" AS ENUM ('FULL_EDIT', 'EDIT', 'COMMENT', 'VIEW');
CREATE TYPE "StatusInheritance" AS ENUM ('SPACE', 'FOLDER', 'OWN');
CREATE TYPE "AutomationTrigger" AS ENUM ('TASK_CREATED', 'TASK_STATUS_CHANGED', 'TASK_UPDATED', 'TASK_PRIORITY_CHANGED', 'TASK_NAME_CHANGED', 'TASK_TYPE_CHANGED', 'TASK_DUE_DATE_CHANGED', 'TASK_START_DATE_CHANGED', 'TASK_ASSIGNED', 'TASK_MOVED_TO_LIST', 'ASSIGNEE_REMOVED', 'TAG_ADDED', 'TAG_REMOVED', 'COMMENT_CREATED', 'SUBTASK_CREATED', 'ALL_SUBTASKS_RESOLVED', 'CUSTOMFIELD_CHANGED', 'CRON');
CREATE TYPE "AutomationScopeType" AS ENUM ('WORKSPACE', 'SPACE', 'FOLDER', 'LIST');
CREATE TYPE "LinkType" AS ENUM ('RELATES_TO', 'DUPLICATES', 'IS_DUPLICATED_BY');

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_department_id_fkey";
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_workspace_id_fkey";
ALTER TABLE "sectors" DROP CONSTRAINT IF EXISTS "sectors_department_id_fkey";
ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "areas_department_id_fkey";
ALTER TABLE "processes" DROP CONSTRAINT IF EXISTS "processes_sector_id_fkey";
ALTER TABLE "processes" DROP CONSTRAINT IF EXISTS "processes_department_id_fkey";
ALTER TABLE "processes" DROP CONSTRAINT IF EXISTS "processes_area_id_fkey";
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_process_id_fkey";
ALTER TABLE "handoffs" DROP CONSTRAINT IF EXISTS "handoffs_from_process_id_fkey";
ALTER TABLE "handoffs" DROP CONSTRAINT IF EXISTS "handoffs_to_process_id_fkey";
ALTER TABLE "process_instances" DROP CONSTRAINT IF EXISTS "process_instances_process_id_fkey";
ALTER TABLE "workflow_statuses" DROP CONSTRAINT IF EXISTS "workflow_statuses_department_id_fkey";
ALTER TABLE "workflow_statuses" DROP CONSTRAINT IF EXISTS "workflow_statuses_area_id_fkey";
ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_process_id_fkey";
ALTER TABLE "work_item_templates" DROP CONSTRAINT IF EXISTS "work_item_templates_department_id_fkey";
ALTER TABLE "work_item_templates" DROP CONSTRAINT IF EXISTS "work_item_templates_process_id_fkey";
ALTER TABLE "process_views" DROP CONSTRAINT IF EXISTS "process_views_process_id_fkey";

DROP INDEX IF EXISTS "idx_wf_statuses_dept_sort";
DROP INDEX IF EXISTS "idx_wf_statuses_area_sort";
DROP INDEX IF EXISTS "idx_work_items_process_status";
DROP INDEX IF EXISTS "idx_workitems_process_deleted_parent";
DROP INDEX IF EXISTS "idx_work_items_archived_process";
DROP INDEX IF EXISTS "work_item_links_from_task_id_to_task_id_key";
DROP INDEX IF EXISTS "idx_process_views_process";
DROP INDEX IF EXISTS "idx_areas_department";
DROP INDEX IF EXISTS "idx_processes_department";
DROP INDEX IF EXISTS "idx_processes_area";

ALTER TABLE "departments" RENAME TO "spaces";
ALTER TABLE "areas" RENAME TO "folders";
ALTER TABLE "processes" RENAME TO "lists";

ALTER INDEX IF EXISTS "departments_pkey" RENAME TO "spaces_pkey";
ALTER INDEX IF EXISTS "areas_pkey" RENAME TO "folders_pkey";
ALTER INDEX IF EXISTS "processes_pkey" RENAME TO "lists_pkey";
ALTER INDEX IF EXISTS "departments_slug_key" RENAME TO "spaces_slug_key";
ALTER INDEX IF EXISTS "areas_slug_key" RENAME TO "folders_slug_key";
ALTER INDEX IF EXISTS "processes_slug_key" RENAME TO "lists_slug_key";
ALTER INDEX IF EXISTS "idx_departments_ws_deleted" RENAME TO "idx_spaces_ws_deleted";
ALTER INDEX IF EXISTS "departments_workspace_id_idx" RENAME TO "spaces_workspace_id_idx";

ALTER TABLE "users" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "sectors" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "folders" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "lists" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "lists" RENAME COLUMN "area_id" TO "folder_id";
ALTER TABLE "activities" RENAME COLUMN "process_id" TO "list_id";
ALTER TABLE "handoffs" RENAME COLUMN "from_process_id" TO "from_list_id";
ALTER TABLE "handoffs" RENAME COLUMN "to_process_id" TO "to_list_id";
ALTER TABLE "process_instances" RENAME COLUMN "process_id" TO "list_id";
ALTER TABLE "workflow_statuses" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "workflow_statuses" RENAME COLUMN "area_id" TO "folder_id";
ALTER TABLE "work_items" RENAME COLUMN "process_id" TO "list_id";
ALTER TABLE "work_item_templates" RENAME COLUMN "department_id" TO "space_id";
ALTER TABLE "work_item_templates" RENAME COLUMN "process_id" TO "list_id";
ALTER TABLE "process_views" RENAME COLUMN "process_id" TO "list_id";

ALTER TABLE "spaces" RENAME COLUMN "sort_order" TO "position";
ALTER TABLE "spaces" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "spaces" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN "default_task_type_id" TEXT;

ALTER TABLE "folders" RENAME COLUMN "sort_order" TO "position";
ALTER TABLE "folders" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "folders" ADD COLUMN "status_inheritance" "StatusInheritance" NOT NULL DEFAULT 'SPACE';
ALTER TABLE "folders" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "folders" ADD COLUMN "default_task_type_id" TEXT;

ALTER TABLE "lists" RENAME COLUMN "sort_order" TO "position";
ALTER TABLE "lists" ADD COLUMN "icon" TEXT;
ALTER TABLE "lists" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "lists" ADD COLUMN "status_inheritance" "StatusInheritance" NOT NULL DEFAULT 'FOLDER';
ALTER TABLE "lists" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "lists" ADD COLUMN "default_task_type_id" TEXT;

ALTER TABLE "custom_task_types" ADD COLUMN "space_id" TEXT;
ALTER TABLE "work_item_tags" ADD COLUMN "space_id" TEXT;
ALTER TABLE "work_item_links" ADD COLUMN "type" "LinkType" NOT NULL DEFAULT 'RELATES_TO';

ALTER TABLE "work_item_comments" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "work_item_comments" ADD COLUMN "mentions" JSONB;
ALTER TABLE "work_item_comments" ADD COLUMN "assignee_id" TEXT;
ALTER TABLE "work_item_comments" ADD COLUMN "assigned_by_id" TEXT;
ALTER TABLE "work_item_comments" ADD COLUMN "resolved_at" TIMESTAMP(3);
ALTER TABLE "work_item_comments" ADD COLUMN "resolved_by_id" TEXT;
ALTER TABLE "work_item_comments" ADD COLUMN "source" TEXT;

ALTER TABLE "custom_field_definitions" ADD COLUMN "space_id" TEXT;
ALTER TABLE "custom_field_definitions" ADD COLUMN "folder_id" TEXT;
ALTER TABLE "custom_field_definitions" ADD COLUMN "list_id" TEXT;
ALTER TABLE "custom_field_definitions" ADD COLUMN "custom_task_type_id" TEXT;

ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_one_scope_chk"
  CHECK (
    (("space_id" IS NOT NULL)::int +
     ("folder_id" IS NOT NULL)::int +
     ("list_id" IS NOT NULL)::int +
     ("custom_task_type_id" IS NOT NULL)::int) <= 1
  );

CREATE TABLE "space_members" (
  "space_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "permission" "MemberPermission" NOT NULL DEFAULT 'VIEW',
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by" TEXT,
  CONSTRAINT "space_members_pkey" PRIMARY KEY ("space_id", "user_id")
);

CREATE TABLE "folder_members" (
  "folder_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "permission" "MemberPermission" NOT NULL DEFAULT 'VIEW',
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by" TEXT,
  CONSTRAINT "folder_members_pkey" PRIMARY KEY ("folder_id", "user_id")
);

CREATE TABLE "list_members" (
  "list_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "permission" "MemberPermission" NOT NULL DEFAULT 'VIEW',
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by" TEXT,
  CONSTRAINT "list_members_pkey" PRIMARY KEY ("list_id", "user_id")
);

CREATE TABLE "comment_reactions" (
  "comment_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("comment_id", "user_id", "emoji")
);

CREATE TABLE "work_item_time_entries" (
  "id" TEXT NOT NULL,
  "work_item_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3),
  "duration_seconds" INTEGER,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "work_item_time_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automations" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" "AutomationTrigger" NOT NULL,
  "scope_type" "AutomationScopeType" NOT NULL,
  "scope_id" TEXT,
  "compiled_actions" JSONB NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "execution_count" INTEGER NOT NULL DEFAULT 0,
  "last_executed_at" TIMESTAMP(3),
  "cron_expression" TEXT,
  "timezone" TEXT,
  "next_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_folders_space" ON "folders"("space_id");
CREATE INDEX "idx_lists_space" ON "lists"("space_id");
CREATE INDEX "idx_lists_folder" ON "lists"("folder_id");
CREATE INDEX "idx_space_members_user" ON "space_members"("user_id");
CREATE INDEX "idx_folder_members_user" ON "folder_members"("user_id");
CREATE INDEX "idx_list_members_user" ON "list_members"("user_id");
CREATE INDEX "idx_comment_reactions_user" ON "comment_reactions"("user_id");
CREATE INDEX "idx_wi_time_entries_task_user_start" ON "work_item_time_entries"("work_item_id", "user_id", "start_time");
CREATE INDEX "idx_wi_time_entries_user_start" ON "work_item_time_entries"("user_id", "start_time");
CREATE INDEX "idx_automations_ws_active_trigger" ON "automations"("workspace_id", "is_active", "trigger");
CREATE INDEX "idx_automations_ws_scope" ON "automations"("workspace_id", "scope_type", "scope_id");
CREATE INDEX "idx_automations_next_run" ON "automations"("next_run_at");
CREATE INDEX "idx_wf_statuses_space_sort" ON "workflow_statuses"("space_id", "sort_order");
CREATE INDEX "idx_wf_statuses_folder_sort" ON "workflow_statuses"("folder_id", "sort_order");
CREATE INDEX "idx_work_items_list_status" ON "work_items"("list_id", "status_id");
CREATE INDEX "idx_workitems_list_deleted_parent" ON "work_items"("list_id", "deleted_at", "parent_id");
CREATE INDEX "idx_work_items_archived_list" ON "work_items"("archived", "list_id", "deleted_at");
CREATE INDEX "idx_custom_task_types_space" ON "custom_task_types"("space_id");
CREATE INDEX "idx_wi_tags_space" ON "work_item_tags"("space_id");
CREATE UNIQUE INDEX "work_item_links_from_task_id_to_task_id_type_key" ON "work_item_links"("from_task_id", "to_task_id", "type");
CREATE INDEX "idx_wi_comments_parent" ON "work_item_comments"("parent_id");
CREATE INDEX "idx_wi_comments_assignee" ON "work_item_comments"("assignee_id");
CREATE INDEX "idx_process_views_list" ON "process_views"("list_id");
CREATE INDEX "idx_cfd_space" ON "custom_field_definitions"("space_id");
CREATE INDEX "idx_cfd_folder" ON "custom_field_definitions"("folder_id");
CREATE INDEX "idx_cfd_list" ON "custom_field_definitions"("list_id");
CREATE INDEX "idx_cfd_task_type" ON "custom_field_definitions"("custom_task_type_id");

ALTER TABLE "users" ADD CONSTRAINT "users_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_default_task_type_id_fkey" FOREIGN KEY ("default_task_type_id") REFERENCES "custom_task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_default_task_type_id_fkey" FOREIGN KEY ("default_task_type_id") REFERENCES "custom_task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lists" ADD CONSTRAINT "lists_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lists" ADD CONSTRAINT "lists_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lists" ADD CONSTRAINT "lists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lists" ADD CONSTRAINT "lists_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lists" ADD CONSTRAINT "lists_default_task_type_id_fkey" FOREIGN KEY ("default_task_type_id") REFERENCES "custom_task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_members" ADD CONSTRAINT "folder_members_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_members" ADD CONSTRAINT "folder_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "folder_members" ADD CONSTRAINT "folder_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_from_list_id_fkey" FOREIGN KEY ("from_list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_to_list_id_fkey" FOREIGN KEY ("to_list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_task_types" ADD CONSTRAINT "custom_task_types_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_tags" ADD CONSTRAINT "work_item_tags_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_templates" ADD CONSTRAINT "work_item_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_templates" ADD CONSTRAINT "work_item_templates_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_item_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "work_item_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_item_time_entries" ADD CONSTRAINT "work_item_time_entries_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_item_time_entries" ADD CONSTRAINT "work_item_time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "process_views" ADD CONSTRAINT "process_views_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_custom_task_type_id_fkey" FOREIGN KEY ("custom_task_type_id") REFERENCES "custom_task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
