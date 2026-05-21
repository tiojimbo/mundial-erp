CREATE TYPE "FavoritePosition" AS ENUM ('TOP', 'SIDEBAR', 'BOTTOM');

ALTER TABLE "favorites"
    DROP COLUMN "position",
    ADD COLUMN "position" "FavoritePosition" NOT NULL DEFAULT 'SIDEBAR',
    ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "favorites_user_id_workspace_id_idx";

CREATE INDEX "favorites_user_id_workspace_id_position_order_idx"
    ON "favorites"("user_id", "workspace_id", "position", "order");
