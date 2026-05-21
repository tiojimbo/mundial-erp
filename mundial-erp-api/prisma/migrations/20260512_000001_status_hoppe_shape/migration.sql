ALTER TYPE "StatusCategory" RENAME TO "StatusType";

ALTER TABLE "workflow_statuses" RENAME TO "statuses";
ALTER TABLE "statuses" RENAME COLUMN "category" TO "type";
ALTER TABLE "statuses" RENAME COLUMN "sort_order" TO "position";
ALTER TABLE "statuses" ALTER COLUMN "space_id" DROP NOT NULL;
ALTER TABLE "statuses" DROP COLUMN "icon";
ALTER TABLE "statuses" DROP COLUMN "is_default";
ALTER TABLE "statuses" ADD COLUMN "list_id" TEXT;

ALTER TABLE "statuses"
  ADD CONSTRAINT "statuses_list_id_fkey"
  FOREIGN KEY ("list_id") REFERENCES "lists"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "idx_wf_statuses_space_sort";
DROP INDEX "idx_wf_statuses_folder_sort";
CREATE INDEX "idx_statuses_space_position" ON "statuses"("space_id", "position");
CREATE INDEX "idx_statuses_folder_position" ON "statuses"("folder_id", "position");
CREATE INDEX "idx_statuses_list_position" ON "statuses"("list_id", "position");

ALTER TABLE "status_template_items" RENAME COLUMN "category" TO "type";
ALTER TABLE "status_template_items" RENAME COLUMN "sort_order" TO "position";
ALTER TABLE "status_template_items" DROP COLUMN "icon";

UPDATE "automations"
SET "compiled_actions" = REGEXP_REPLACE(
  "compiled_actions"::text,
  '"workflowStatusId"',
  '"statusId"',
  'g'
)::jsonb
WHERE "compiled_actions"::text LIKE '%"workflowStatusId"%';
