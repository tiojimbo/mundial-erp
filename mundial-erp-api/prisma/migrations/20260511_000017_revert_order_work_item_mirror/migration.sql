DROP INDEX IF EXISTS "idx_orders_work_item_id";

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_work_item_id_fkey";

ALTER TABLE "orders" DROP COLUMN IF EXISTS "work_item_id";
