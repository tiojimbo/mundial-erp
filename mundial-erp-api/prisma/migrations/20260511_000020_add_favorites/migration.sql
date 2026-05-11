CREATE TYPE "FavoriteEntity" AS ENUM ('SPACE', 'FOLDER', 'LIST', 'TASK', 'CHAT_CHANNEL');

CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "entity_type" "FavoriteEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "favorites_user_id_workspace_id_idx" ON "favorites"("user_id", "workspace_id");

CREATE UNIQUE INDEX "favorites_user_id_workspace_id_entity_type_entity_id_key" ON "favorites"("user_id", "workspace_id", "entity_type", "entity_id");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
