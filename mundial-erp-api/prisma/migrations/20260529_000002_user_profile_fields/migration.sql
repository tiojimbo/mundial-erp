CREATE TYPE "AppearanceMode" AS ENUM ('LIGHT', 'DARK', 'AUTO');
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
ALTER TABLE "users" ADD COLUMN "theme_color" TEXT;
ALTER TABLE "users" ADD COLUMN "appearance" "AppearanceMode" NOT NULL DEFAULT 'AUTO';
