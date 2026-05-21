ALTER TABLE "custom_field_definitions"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "visible_to_guests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "fill_method" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "default_value" JSONB,
  ADD COLUMN "validation" JSONB,
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "group_id" TEXT,
  ADD COLUMN "group_name" TEXT,
  ADD COLUMN "group_position" INTEGER,
  ADD COLUMN "group_color" TEXT;

ALTER TABLE "custom_field_definitions"
  ADD CONSTRAINT "custom_field_definitions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_cfd_created_by" ON "custom_field_definitions" ("created_by_id");
