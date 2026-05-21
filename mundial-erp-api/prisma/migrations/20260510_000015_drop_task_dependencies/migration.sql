INSERT INTO "work_item_links" (id, from_task_id, to_task_id, type, created_at, created_by)
SELECT id, from_task_id, to_task_id, 'RELATES_TO'::"LinkType", created_at, created_by
FROM "work_item_dependencies"
ON CONFLICT (from_task_id, to_task_id, type) DO NOTHING;

ALTER TABLE "work_item_dependencies" DROP CONSTRAINT IF EXISTS "work_item_dependencies_from_task_id_fkey";
ALTER TABLE "work_item_dependencies" DROP CONSTRAINT IF EXISTS "work_item_dependencies_to_task_id_fkey";
DROP INDEX IF EXISTS "work_item_dependencies_from_task_id_to_task_id_key";
DROP INDEX IF EXISTS "idx_wi_deps_to";

ALTER TABLE "work_item_dependencies" RENAME TO "work_item_dependencies_legacy_20260510";
