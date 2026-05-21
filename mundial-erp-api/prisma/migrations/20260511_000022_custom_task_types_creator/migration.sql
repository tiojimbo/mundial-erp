ALTER TABLE "custom_task_types"
  ADD COLUMN "creator_id" TEXT;

ALTER TABLE "custom_task_types"
  ADD CONSTRAINT "custom_task_types_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_custom_task_types_creator"
  ON "custom_task_types" ("creator_id");
