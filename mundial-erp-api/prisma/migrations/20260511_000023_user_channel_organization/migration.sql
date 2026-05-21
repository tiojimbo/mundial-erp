CREATE TABLE "user_channel_organizations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "organization_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_channel_organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_channel_organizations_user_id_workspace_id_key"
    ON "user_channel_organizations"("user_id", "workspace_id");

ALTER TABLE "user_channel_organizations"
    ADD CONSTRAINT "user_channel_organizations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_channel_organizations"
    ADD CONSTRAINT "user_channel_organizations_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
