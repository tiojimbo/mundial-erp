ALTER TABLE "work_item_comments" RENAME COLUMN "body" TO "content";
ALTER TABLE "work_item_comments" RENAME COLUMN "body_blocks" TO "content_blocks";
ALTER TABLE "work_item_checklists" RENAME COLUMN "name" TO "title";
ALTER TABLE "work_item_checklist_items" RENAME COLUMN "name" TO "title";
