-- Step 1: Add new enum values
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PUBLIC';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PRIVATE';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DIRECT';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'GROUP_DM';

-- Step 2: Migrate data
UPDATE "chat_channels" SET "type" = 'PUBLIC' WHERE "type" = 'CHANNEL' AND "visibility" = 'PUBLIC';
UPDATE "chat_channels" SET "type" = 'PRIVATE' WHERE "type" = 'CHANNEL' AND "visibility" = 'PRIVATE';

-- For DMs, distinguish DIRECT (2 participants) vs GROUP_DM (3+)
UPDATE "chat_channels" SET "type" = 'DIRECT'
WHERE "type" = 'DIRECT_MESSAGE'
AND (SELECT COUNT(*) FROM "chat_channel_members" WHERE "channel_id" = "chat_channels"."id" AND "left_at" IS NULL) <= 2;

UPDATE "chat_channels" SET "type" = 'GROUP_DM'
WHERE "type" = 'DIRECT_MESSAGE'
AND (SELECT COUNT(*) FROM "chat_channel_members" WHERE "channel_id" = "chat_channels"."id" AND "left_at" IS NULL) > 2;

-- Step 3: Drop visibility column
ALTER TABLE "chat_channels" DROP COLUMN IF EXISTS "visibility";

-- Step 4: Remove old enum values (requires recreating enum — Prisma handles this with db push)
