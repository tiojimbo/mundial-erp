ALTER TABLE "activities" ALTER COLUMN "owner_role" TYPE TEXT USING "owner_role"::text;
ALTER TABLE "users" DROP COLUMN "role";
DROP TABLE "role_permissions";
DROP TYPE "Role";
