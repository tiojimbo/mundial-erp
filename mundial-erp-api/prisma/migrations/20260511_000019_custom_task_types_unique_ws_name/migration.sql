CREATE UNIQUE INDEX "uniq_custom_task_types_ws_name_active"
  ON "custom_task_types" ("workspace_id", "name")
  WHERE "deleted_at" IS NULL;
