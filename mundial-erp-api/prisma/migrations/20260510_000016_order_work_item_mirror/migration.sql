ALTER TABLE "orders" ADD COLUMN "work_item_id" TEXT;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_work_item_id_fkey"
  FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_orders_work_item_id" ON "orders"("work_item_id");
