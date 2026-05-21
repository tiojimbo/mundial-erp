CREATE TABLE "status_required_fields" (
  "id" TEXT PRIMARY KEY,
  "status_id" TEXT NOT NULL,
  "custom_field_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "status_required_fields_status_id_fkey"
    FOREIGN KEY ("status_id") REFERENCES "statuses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "status_required_fields_custom_field_id_fkey"
    FOREIGN KEY ("custom_field_id") REFERENCES "custom_field_definitions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "status_required_fields_status_id_custom_field_id_key"
  ON "status_required_fields"("status_id", "custom_field_id");

CREATE INDEX "status_required_fields_status_id_idx"
  ON "status_required_fields"("status_id");
