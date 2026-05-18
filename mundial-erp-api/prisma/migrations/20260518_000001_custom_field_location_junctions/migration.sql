CREATE TABLE "custom_field_lists" (
  "id"              TEXT PRIMARY KEY,
  "custom_field_id" TEXT NOT NULL,
  "list_id"         TEXT NOT NULL,
  "group_id"        TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "custom_field_lists_custom_field_fkey"
    FOREIGN KEY ("custom_field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_lists_list_fkey"
    FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_lists_group_fkey"
    FOREIGN KEY ("group_id") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "custom_field_lists_custom_field_id_list_id_key"
  ON "custom_field_lists" ("custom_field_id", "list_id");
CREATE INDEX "custom_field_lists_list_id_idx" ON "custom_field_lists" ("list_id");
CREATE INDEX "custom_field_lists_custom_field_id_idx" ON "custom_field_lists" ("custom_field_id");

CREATE TABLE "custom_field_folders" (
  "id"              TEXT PRIMARY KEY,
  "custom_field_id" TEXT NOT NULL,
  "folder_id"       TEXT NOT NULL,
  "group_id"        TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "custom_field_folders_custom_field_fkey"
    FOREIGN KEY ("custom_field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_folders_folder_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_folders_group_fkey"
    FOREIGN KEY ("group_id") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "custom_field_folders_custom_field_id_folder_id_key"
  ON "custom_field_folders" ("custom_field_id", "folder_id");
CREATE INDEX "custom_field_folders_folder_id_idx" ON "custom_field_folders" ("folder_id");
CREATE INDEX "custom_field_folders_custom_field_id_idx" ON "custom_field_folders" ("custom_field_id");

CREATE TABLE "custom_field_spaces" (
  "id"              TEXT PRIMARY KEY,
  "custom_field_id" TEXT NOT NULL,
  "space_id"        TEXT NOT NULL,
  "group_id"        TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "custom_field_spaces_custom_field_fkey"
    FOREIGN KEY ("custom_field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_spaces_space_fkey"
    FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_field_spaces_group_fkey"
    FOREIGN KEY ("group_id") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "custom_field_spaces_custom_field_id_space_id_key"
  ON "custom_field_spaces" ("custom_field_id", "space_id");
CREATE INDEX "custom_field_spaces_space_id_idx" ON "custom_field_spaces" ("space_id");
CREATE INDEX "custom_field_spaces_custom_field_id_idx" ON "custom_field_spaces" ("custom_field_id");

INSERT INTO "custom_field_lists" ("id", "custom_field_id", "list_id", "group_id", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "list_id", "group_id", "created_at", "updated_at"
FROM "custom_field_definitions"
WHERE "list_id" IS NOT NULL AND "deleted_at" IS NULL;

INSERT INTO "custom_field_folders" ("id", "custom_field_id", "folder_id", "group_id", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "folder_id", "group_id", "created_at", "updated_at"
FROM "custom_field_definitions"
WHERE "folder_id" IS NOT NULL AND "deleted_at" IS NULL;

INSERT INTO "custom_field_spaces" ("id", "custom_field_id", "space_id", "group_id", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "space_id", "group_id", "created_at", "updated_at"
FROM "custom_field_definitions"
WHERE "space_id" IS NOT NULL AND "deleted_at" IS NULL;
