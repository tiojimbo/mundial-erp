ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'DURATION';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'LABEL';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'PEOPLE';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'PERCENTAGE';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'RATING';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'RELATIONSHIP';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'ROLLUP';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'SELECT';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'USER';

CREATE TABLE "custom_field_groups" (
  "id"           TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL,
  "name"         VARCHAR(120) NOT NULL,
  "color"        VARCHAR(20),
  "position"     INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "custom_field_groups_workspace_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_custom_field_groups_workspace" ON "custom_field_groups"("workspace_id");

ALTER TABLE "custom_field_definitions" ADD COLUMN "name" VARCHAR(120);
UPDATE "custom_field_definitions" SET "name" = "label" WHERE "name" IS NULL;
ALTER TABLE "custom_field_definitions" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "custom_field_definitions" ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE "custom_field_definitions"
   SET "options" = COALESCE("config"->'options', '[]'::jsonb)
 WHERE "type" = 'DROPDOWN';

ALTER TABLE "custom_field_definitions"
  ADD CONSTRAINT "custom_field_definitions_group_fkey"
  FOREIGN KEY ("group_id") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL;

CREATE INDEX "idx_cfd_workspace_type" ON "custom_field_definitions"("workspace_id", "type");

ALTER TABLE "custom_field_values" ADD COLUMN "value_json" JSONB;
ALTER TABLE "custom_field_values" ADD COLUMN "value_boolean" BOOLEAN;
