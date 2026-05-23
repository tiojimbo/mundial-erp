ALTER TABLE "custom_field_definitions" ADD COLUMN "autofill_source" TEXT;

CREATE INDEX "idx_cfd_autofill_source" ON "custom_field_definitions"("workspace_id", "autofill_source");

UPDATE "custom_field_definitions" SET
  "workspace_id" = (
    SELECT "id" FROM "workspaces"
    WHERE "deleted_at" IS NULL
    ORDER BY "created_at" ASC
    LIMIT 1
  ),
  "autofill_source" = CASE "id"
    WHEN 'cfd-cnpj-af-razao-social' THEN 'razaoSocial'
    WHEN 'cfd-cnpj-af-nome-fantasia' THEN 'nomeFantasia'
    WHEN 'cfd-cnpj-af-email' THEN 'contato.email'
    WHEN 'cfd-cnpj-af-telefone' THEN 'contato.telefone'
    WHEN 'cfd-cnpj-af-cep' THEN 'endereco.cep'
    WHEN 'cfd-cnpj-af-logradouro' THEN 'endereco.logradouro'
    WHEN 'cfd-cnpj-af-numero' THEN 'endereco.numero'
    WHEN 'cfd-cnpj-af-complemento' THEN 'endereco.complemento'
    WHEN 'cfd-cnpj-af-bairro' THEN 'endereco.bairro'
    WHEN 'cfd-cnpj-af-municipio' THEN 'endereco.municipio'
    WHEN 'cfd-cnpj-af-uf' THEN 'endereco.uf'
    WHEN 'cfd-cnpj-af-data-abertura' THEN 'dataAbertura'
    WHEN 'cfd-cnpj-af-situacao' THEN 'situacaoCadastral'
    WHEN 'cfd-cnpj-af-natureza' THEN 'naturezaJuridica'
    WHEN 'cfd-cnpj-af-cnae-codigo' THEN 'cnaePrincipal.codigo'
    WHEN 'cfd-cnpj-af-cnae-descricao' THEN 'cnaePrincipal.descricao'
    WHEN 'cfd-cnpj-af-porte' THEN 'porte'
    WHEN 'cfd-cnpj-af-capital-social' THEN 'capitalSocial'
  END
WHERE "id" LIKE 'cfd-cnpj-af-%';
