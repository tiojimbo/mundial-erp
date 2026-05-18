DROP INDEX IF EXISTS "custom_field_definitions_workspace_id_key_key";

CREATE UNIQUE INDEX "cfd_workspace_scoped_key_unique"
  ON "custom_field_definitions" (
    "workspace_id",
    "key",
    "space_id",
    "folder_id",
    "list_id",
    "custom_task_type_id"
  )
  NULLS NOT DISTINCT
  WHERE "workspace_id" IS NOT NULL AND "deleted_at" IS NULL;
