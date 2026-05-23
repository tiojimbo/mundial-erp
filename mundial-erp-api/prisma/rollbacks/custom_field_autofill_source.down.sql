UPDATE "custom_field_definitions" SET "workspace_id" = NULL, "autofill_source" = NULL
WHERE "id" LIKE 'cfd-cnpj-af-%';

DROP INDEX IF EXISTS "idx_cfd_autofill_source";

ALTER TABLE "custom_field_definitions" DROP COLUMN "autofill_source";
